import { convertToHtml } from 'yahtml';
import { parseAndRender } from 'jempl';
import path from 'path';
import yaml from 'js-yaml';
import matter from 'gray-matter';

import MarkdownIt from 'markdown-it';
import rtglMarkdown from './rtglMarkdown.js';
import builtinTemplateFunctions from './builtinTemplateFunctions.js';
import { buildSitemapXml, resolveSitemapOutputPath } from './sitemap.js';
import {
  createRenderComponentFunction,
  loadComponentRegistry,
  loadComponentRendererFromProject
} from './componentRenderer.js';
import { assertSafeOutputPath } from './utils/pathSafety.js';
import { deepMerge, isPlainObject } from './utils/object.js';
import { loadImportedAliases, loadImportedData, writeImportIndex } from './imports.js';
import { readDataDir, readYamlTree, resolveDirentKind } from './sources.js';
import {
  htmlOutputRelativePathFromUrl,
  markdownOutputRelativePathFromUrl,
  normalizePageUrlOverride,
  normalizeRelativeUrlPath,
  resolvePageUrl
} from './routes.js';

const MATTER_OPTIONS = {
  engines: {
    yaml: (source) => yaml.load(source, { schema: yaml.JSON_SCHEMA })
  }
};

const EACH_CONFIG_KEYS = ['data', 'as', 'url'];
const EACH_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Page context keys set by the builder; an _each variable with one of these names would be overwritten.
const RESERVED_PAGE_CONTEXT_KEYS = new Set(['collections', 'page', 'build', 'content']);

// An exact top-level key wins (including keys that contain a dot); otherwise walk the dot path.
function resolveGlobalDataPath(globalData, dataPath) {
  if (Object.hasOwn(globalData, dataPath)) {
    return { found: true, value: globalData[dataPath] };
  }

  let current = globalData;
  for (const segment of dataPath.split('.')) {
    if (segment === '' || current === null || typeof current !== 'object' || !Object.hasOwn(current, segment)) {
      return { found: false };
    }
    current = current[segment];
  }

  return { found: true, value: current };
}

function resolveBindings(bindConfig, globalData, pagePath) {
  if (bindConfig === undefined) {
    return {};
  }

  if (!isPlainObject(bindConfig)) {
    throw new Error(`Invalid _bind in ${pagePath}: expected an object mapping local names to global data keys.`);
  }

  const bindings = {};
  for (const [rawLocalKey, rawSourceKey] of Object.entries(bindConfig)) {
    const localKey = String(rawLocalKey).trim();
    if (localKey === '') {
      throw new Error(`Invalid _bind in ${pagePath}: local key names must be non-empty.`);
    }

    if (typeof rawSourceKey !== 'string' || rawSourceKey.trim() === '') {
      throw new Error(`Invalid _bind in ${pagePath} for "${localKey}": expected a non-empty global data key string.`);
    }

    const sourceKey = rawSourceKey.trim();
    const resolved = resolveGlobalDataPath(globalData, sourceKey);
    if (!resolved.found) {
      throw new Error(`Invalid _bind in ${pagePath} for "${localKey}": global data key "${sourceKey}" not found.`);
    }

    bindings[localKey] = resolved.value;
  }

  return bindings;
}

function normalizeEachConfig(eachConfig, bindings, pagePath) {
  if (eachConfig === undefined) {
    return null;
  }

  if (!isPlainObject(eachConfig)) {
    throw new Error(`Invalid _each in ${pagePath}: expected an object with "data", "as", and "url".`);
  }

  for (const key of Object.keys(eachConfig)) {
    if (!EACH_CONFIG_KEYS.includes(key)) {
      throw new Error(`Invalid _each in ${pagePath}: unsupported key "${key}". Supported keys: ${EACH_CONFIG_KEYS.join(', ')}.`);
    }
  }

  for (const key of EACH_CONFIG_KEYS) {
    if (typeof eachConfig[key] !== 'string' || eachConfig[key].trim() === '') {
      throw new Error(`Invalid _each in ${pagePath}: "${key}" must be a non-empty string.`);
    }
  }

  const as = eachConfig.as.trim();
  if (!EACH_IDENTIFIER_PATTERN.test(as)) {
    throw new Error(`Invalid _each in ${pagePath}: "as" must be a variable name made of letters, digits, and underscores, not starting with a digit.`);
  }

  if (RESERVED_PAGE_CONTEXT_KEYS.has(as)) {
    throw new Error(`Invalid _each in ${pagePath}: "as" must not be a reserved name (${Array.from(RESERVED_PAGE_CONTEXT_KEYS).join(', ')}).`);
  }

  if (Object.hasOwn(bindings, as)) {
    throw new Error(`Invalid _each in ${pagePath}: "as" name "${as}" is already used by _bind.`);
  }

  return {
    data: eachConfig.data.trim(),
    as,
    url: eachConfig.url
  };
}

function splitSystemFrontmatter(frontmatter, globalData, pagePath) {
  const normalized = isPlainObject(frontmatter) ? { ...frontmatter } : {};
  const bindConfig = normalized._bind;
  const eachConfig = normalized._each;
  delete normalized._bind;
  delete normalized._each;

  const bindings = resolveBindings(bindConfig, globalData, pagePath);
  const each = normalizeEachConfig(eachConfig, bindings, pagePath);

  if (each && Object.hasOwn(normalized, 'url')) {
    throw new Error(`Invalid _each in ${pagePath}: remove the "url" frontmatter key; "_each.url" sets the URL of each generated page.`);
  }

  return { frontmatter: normalized, bindings, each };
}

// gray-matter reads the whole file as frontmatter when an opening "---" has no closing "---" line.
// This is the test gray-matter's parseMatter makes, on a source without a byte order mark.
function isUnclosedFrontmatter(raw) {
  return raw.startsWith('---') && raw.charAt(3) !== '-' && raw.slice(3).indexOf('\n---') === -1;
}

// yahtml flattens nested lists among an element's children (a $for, a list $partial, a multi-item $if)
// but renders nothing for a nested list at the root, so flatten the root list the same way.
// A result that is not a list is passed through, so convertToHtml still rejects it.
function toRootList(result) {
  return Array.isArray(result) ? result.flat(Infinity) : result;
}

function hasPageExtension(fileName) {
  return fileName.endsWith('.yaml') || fileName.endsWith('.yml') || fileName.endsWith('.md');
}

export function createSiteBuilder({
  fs,
  rootDir = '.',
  outputPath = '_site',
  md,
  markdown = {},
  keepMarkdownFiles = false,
  imports = {},
  data = {},
  sitemap,
  fetchImpl,
  functions = {},
  components,
  loadComponentRenderer = loadComponentRendererFromProject,
  quiet = false,
  isScreenshotMode = false
}) {
  return async function build() {
    if (components != null && (!isPlainObject(components) || !Array.isArray(components.dirs) || components.dirs.length === 0)) {
      throw new Error('Invalid components config: expected an object with a non-empty "dirs" array.');
    }

    // Use provided md or default to rtglMarkdown
    const mdInstance = md || rtglMarkdown(MarkdownIt, markdown);
    const absoluteRootDir = path.resolve(rootDir);
    const outputRootDir = path.resolve(rootDir, outputPath);
    assertSafeOutputPath(fs, absoluteRootDir, outputRootDir, outputPath);

    function cleanOutputDir() {
      assertSafeOutputPath(fs, absoluteRootDir, outputRootDir, outputPath);
      if (fs.existsSync(outputRootDir)) {
        fs.rmSync(outputRootDir, { recursive: true, force: true });
      }
      fs.mkdirSync(outputRootDir, { recursive: true });
    }

    const { resolved: importedTemplates, entries: templateEntries } = await loadImportedAliases({
      fs,
      rootDir,
      importMap: imports.templates,
      importGroup: 'templates',
      typeLabel: 'template',
      fetchImpl
    });
    const { resolved: importedPartials, entries: partialEntries } = await loadImportedAliases({
      fs,
      rootDir,
      importMap: imports.partials,
      importGroup: 'partials',
      typeLabel: 'partial',
      fetchImpl
    });

    const importEntries = [...templateEntries, ...partialEntries];
    if (importEntries.length > 0) {
      writeImportIndex(fs, rootDir, importEntries);
    }

    const partials = readYamlTree(fs, path.join(rootDir, 'partials'), 'partial file', { ...importedPartials });

    if (!isPlainObject(data)) {
      throw new Error('Invalid site data: expected an object.');
    }

    const importedData = await loadImportedData(imports.data, fetchImpl);

    // Local files replace imported data with the same alias.
    const fileData = readDataDir(fs, path.join(rootDir, 'data'), { ...importedData });
    const globalData = deepMerge(data, fileData);

    const templates = readYamlTree(fs, path.join(rootDir, 'templates'), 'template file', { ...importedTemplates });

    // Load prerendered components once per build, before any page renders.
    const componentRegistry = components == null
      ? null
      : await loadComponentRegistry({ components, rootDir: absoluteRootDir, loadComponentRenderer });

    function createTemplateFunctions(pageLabel) {
      return {
        ...builtinTemplateFunctions,
        renderComponent: createRenderComponentFunction({ componentRegistry, pageLabel }),
        ...functions
      };
    }

    // Parse frontmatter only when it is truly at the file start.
    function readPageSource(pagePath, isMarkdown) {
      const raw = fs.readFileSync(pagePath, 'utf8').replace(/^\uFEFF/, '');
      let parsed;
      try {
        parsed = matter(raw, MATTER_OPTIONS);
      } catch (error) {
        throw new Error(`Invalid frontmatter in ${pagePath}: ${error.message}`);
      }

      const unclosedFrontmatter = isUnclosedFrontmatter(raw);
      if (unclosedFrontmatter) {
        // A YAML page that starts with a "---" document marker followed by a list or scalar is all body.
        if (!isMarkdown && parsed.data !== null && !isPlainObject(parsed.data)) {
          return { frontmatter: {}, content: raw.trim(), unclosedFrontmatter: false };
        }
        console.warn(`Frontmatter in ${pagePath} starts with "---" but is never closed, so the whole file is read as frontmatter. Add a closing "---" line.`);
      }

      return {
        frontmatter: isPlainObject(parsed.data) ? parsed.data : {},
        content: (parsed.content || '').trim(),
        unclosedFrontmatter
      };
    }

    // Expand an _each page into one page entry per item of its data array.
    function expandEachPageEntries(baseEntry, publicFrontmatter, each) {
      const { pagePath, bindings } = baseEntry;
      const resolved = resolveGlobalDataPath(globalData, each.data);
      if (!resolved.found) {
        throw new Error(`Invalid _each in ${pagePath}: global data path "${each.data}" not found.`);
      }

      if (!Array.isArray(resolved.value)) {
        const actualType = resolved.value === null ? 'null' : typeof resolved.value;
        throw new Error(`Invalid _each in ${pagePath}: global data path "${each.data}" must resolve to an array, got ${actualType}.`);
      }

      return resolved.value.map((item, index) => {
        const pageLabel = `${pagePath} (_each item ${index})`;
        const itemBindings = { ...bindings, [each.as]: item };
        const renderContext = { ...globalData, ...itemBindings };
        const renderOptions = { functions: createTemplateFunctions(pageLabel) };

        let renderedUrl;
        let renderedFrontmatter;
        try {
          renderedUrl = parseAndRender(each.url, renderContext, renderOptions);
          renderedFrontmatter = parseAndRender(publicFrontmatter, renderContext, renderOptions);
        } catch (error) {
          throw new Error(`Invalid _each in ${pagePath} for item ${index}: ${error.message}`);
        }

        const url = normalizePageUrlOverride(renderedUrl, pageLabel);

        return {
          ...baseEntry,
          pageLabel,
          frontmatter: { ...renderedFrontmatter, url },
          bindings: itemBindings,
          url,
          hasCustomUrl: true
        };
      });
    }

    function collectPageEntries() {
      const pageEntries = [];
      const pagesDir = path.join(rootDir, 'pages');

      function scanPages(basePath = '') {
        const fullDir = path.join(pagesDir, basePath);
        if (!fs.existsSync(fullDir)) return;

        const items = fs.readdirSync(fullDir, { withFileTypes: true });

        for (const item of items) {
          const itemPath = path.join(fullDir, item.name);
          const relativePath = basePath ? path.join(basePath, item.name) : item.name;
          const itemKind = resolveDirentKind(fs, itemPath, item);

          if (itemKind === 'directory') {
            scanPages(relativePath);
          } else if (itemKind === 'file' && hasPageExtension(item.name)) {
            const isMarkdown = item.name.endsWith('.md');
            const { frontmatter, content, unclosedFrontmatter } = readPageSource(itemPath, isMarkdown);
            const { frontmatter: publicFrontmatter, bindings, each } = splitSystemFrontmatter(frontmatter, globalData, itemPath);
            const baseEntry = {
              pagePath: itemPath,
              pageLabel: itemPath,
              relativePath: normalizeRelativeUrlPath(relativePath),
              isMarkdown,
              content,
              unclosedFrontmatter,
              bindings
            };

            if (each) {
              for (const generatedEntry of expandEachPageEntries(baseEntry, publicFrontmatter, each)) {
                pageEntries.push(generatedEntry);
              }
              continue;
            }

            const hasCustomUrl = Object.hasOwn(publicFrontmatter, 'url');
            const url = resolvePageUrl(publicFrontmatter, relativePath, itemPath);
            const exposedFrontmatter = hasCustomUrl
              ? { ...publicFrontmatter, url }
              : publicFrontmatter;

            pageEntries.push({
              ...baseEntry,
              frontmatter: exposedFrontmatter,
              url,
              hasCustomUrl
            });
          }
        }
      }

      scanPages();
      return pageEntries;
    }

    function assertUniquePageUrls(pageEntries) {
      const seen = new Map();

      for (const entry of pageEntries) {
        const existingEntry = seen.get(entry.url);
        if (existingEntry) {
          throw new Error(`Duplicate page URL "${entry.url}" in ${entry.pageLabel}; already used by ${existingEntry.pageLabel}.`);
        }
        seen.set(entry.url, entry);
      }
    }

    function assertUniqueMarkdownOutputPaths(pageEntries) {
      if (!keepMarkdownFiles) {
        return;
      }

      const seen = new Map();
      for (const entry of pageEntries) {
        if (!entry.isMarkdown) {
          continue;
        }

        const markdownOutputRelativePath = entry.hasCustomUrl
          ? markdownOutputRelativePathFromUrl(entry.url)
          : entry.relativePath;
        const existingEntry = seen.get(markdownOutputRelativePath);
        if (existingEntry) {
          throw new Error(`Duplicate markdown output path "${markdownOutputRelativePath}" in ${entry.pageLabel}; already used by ${existingEntry.pageLabel}.`);
        }
        seen.set(markdownOutputRelativePath, entry);
      }
    }

    // Function to scan all pages and build collections
    function buildCollections(pageEntries) {
      const collections = {};

      for (const entry of pageEntries) {
        const publicFrontmatter = entry.frontmatter;

        // Process tags
        if (publicFrontmatter.tags) {
          // Normalize tags to array
          const tags = Array.isArray(publicFrontmatter.tags) ? publicFrontmatter.tags : [publicFrontmatter.tags];

          // Add to collections
          tags.forEach(tag => {
            if (typeof tag === 'string' && tag.trim()) {
              const trimmedTag = tag.trim();
              if (!collections[trimmedTag]) {
                collections[trimmedTag] = [];
              }
              collections[trimmedTag].push({
                data: publicFrontmatter,
                url: entry.url,
                content: entry.content
              });
            }
          });
        }
      }

      return collections;
    }

    const pageEntries = collectPageEntries();
    assertUniquePageUrls(pageEntries);
    assertUniqueMarkdownOutputPaths(pageEntries);

    // Build collections in first pass
    if (!quiet) console.log('Building collections...');
    const collections = buildCollections(pageEntries);

    // Render one page in memory, without progress logs or file writes.
    async function renderPage(pageEntry) {
      const {
        pagePath,
        pageLabel,
        content: rawContent,
        frontmatter: publicFrontmatter,
        bindings: boundData,
        isMarkdown,
        url,
        hasCustomUrl,
        relativePath,
        unclosedFrontmatter
      } = pageEntry;

      const templateFunctions = createTemplateFunctions(pageLabel);
      const templateName = publicFrontmatter.template;

      // Name the page and its template in render errors, unless the error already names the page.
      function render(fn) {
        try {
          return fn();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes(pageLabel)) {
            throw error;
          }
          const templateLabel = templateName ? ` with template "${templateName}"` : '';
          throw new Error(`Failed to render ${pageLabel}${templateLabel}: ${message}`, { cause: error });
        }
      }

      // Deep merge global data with frontmatter and collections for the page context
      const pageData = deepMerge(globalData, publicFrontmatter);
      Object.assign(pageData, boundData);
      pageData.collections = collections;
      pageData.page = { url };
      pageData.build = { isScreenshotMode };

      let processedPageContent;

      if (isMarkdown) {
        // Process markdown content with MarkdownIt
        //If markdownit async then use the async render method
        let htmlContent;
        if(mdInstance.renderAsync){
          htmlContent = await mdInstance.renderAsync(rawContent);
        } else {
          htmlContent = mdInstance.render(rawContent);
        }
        // For markdown, store as raw HTML that will be inserted directly
        processedPageContent = { __html: htmlContent };
      } else {
        // Convert YAML content to JSON
        let pageContent;
        try {
          pageContent = yaml.load(rawContent, { schema: yaml.JSON_SCHEMA });
        } catch (error) {
          throw new Error(`Invalid YAML page content in ${pageLabel}: ${error.message}`);
        }
        // An empty body renders nothing inside a template. Without a template the page would be empty.
        if (pageContent === undefined) {
          if (!templateName) {
            throw new Error(unclosedFrontmatter
              ? `Invalid page ${pageLabel}: frontmatter starting with "---" is never closed, so the page has no body. Add a closing "---" line.`
              : `Invalid page ${pageLabel}: the page has no body and no template. Add YAML content or a "template" frontmatter key.`);
          }
          pageContent = [];
        }
        // Process the page content to resolve any $partial references with page data
        processedPageContent = render(() => parseAndRender(pageContent, pageData, { partials, functions: templateFunctions }));
      }

      // Find the template specified in frontmatter
      let templateToUse = null;
      if (templateName) {
        // Look up template by exact path
        templateToUse = templates[templateName];
        if (!templateToUse) {
          throw new Error(`Template "${templateName}" not found in ${pageLabel}. Available templates: ${Object.keys(templates).join(', ')}`);
        }
      }

      // Use the template with jempl to render the processed page content
      let htmlString;

      if (isMarkdown) {
        if (templateToUse) {
          // For markdown with template, use a placeholder and replace after
          const placeholder = `___MARKDOWN_CONTENT_PLACEHOLDER_${Math.random().toString(36).slice(2)}___`;
          const templateData = { ...pageData, content: placeholder, collections };
          htmlString = render(() => convertToHtml(toRootList(
            parseAndRender(templateToUse, templateData, { partials, functions: templateFunctions })
          )));
          // Replace all placeholders with actual markdown HTML content.
          htmlString = htmlString.split(placeholder).join(processedPageContent.__html);
        } else {
          // Markdown without template - use HTML directly
          htmlString = processedPageContent.__html;
        }
      } else {
        // YAML content
        const templateData = { ...pageData, content: processedPageContent, collections };
        htmlString = render(() => {
          const result = templateToUse
            ? parseAndRender(templateToUse, templateData, { partials, functions: templateFunctions })
            : processedPageContent;
          // A result that is not a list becomes a one-item root list.
          return convertToHtml(toRootList([result]));
        });
      }

      const outputRelativePath = htmlOutputRelativePathFromUrl(url);
      const outputPath = path.join(outputRootDir, ...outputRelativePath.split('/'));
      let markdownCopy = null;
      if (isMarkdown && keepMarkdownFiles) {
        const markdownOutputRelativePath = hasCustomUrl
          ? markdownOutputRelativePathFromUrl(url)
          : relativePath;
        markdownCopy = { from: pagePath, to: path.join(outputRootDir, ...markdownOutputRelativePath.split('/')) };
      }

      return { pageLabel, outputPath, html: htmlString, markdownCopy };
    }

    function writeRenderedPage({ pageLabel, outputPath, html, markdownCopy }) {
      if (!quiet) console.log(`Processing ${pageLabel}...`);
      const outputDir = path.dirname(outputPath);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write HTML to output file
      fs.writeFileSync(outputPath, html);
      if (!quiet) console.log(`  -> Written to ${outputPath}`);

      if (markdownCopy) {
        const markdownOutputDir = path.dirname(markdownCopy.to);
        if (!fs.existsSync(markdownOutputDir)) {
          fs.mkdirSync(markdownOutputDir, { recursive: true });
        }
        fs.copyFileSync(markdownCopy.from, markdownCopy.to);
        if (!quiet) console.log(`  -> Copied markdown to ${markdownCopy.to}`);
      }
    }

    function writeSitemapFile(sitemapXml) {
      if (sitemapXml === null) {
        return;
      }

      const sitemapOutputRelativePath = resolveSitemapOutputPath(sitemap);
      const sitemapOutputPath = path.join(outputRootDir, ...sitemapOutputRelativePath.split('/'));
      const sitemapOutputDir = path.dirname(sitemapOutputPath);

      if (!fs.existsSync(sitemapOutputDir)) {
        fs.mkdirSync(sitemapOutputDir, { recursive: true });
      }

      fs.writeFileSync(sitemapOutputPath, sitemapXml);
      if (!quiet) console.log(`  -> Written sitemap to ${sitemapOutputPath}`);
    }

    // Function to copy static files recursively
    function copyStaticFiles() {
      const staticDir = path.join(rootDir, 'static');

      if (!fs.existsSync(staticDir)) {
        return;
      }

      // Ensure output directory exists
      if (!fs.existsSync(outputRootDir)) {
        fs.mkdirSync(outputRootDir, { recursive: true });
      }

      function copyRecursive(src, dest) {
        const stats = fs.statSync(src);

        if (stats.isDirectory()) {
          // Create directory if it doesn't exist
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }

          // Copy all items in directory
          const items = fs.readdirSync(src);
          items.forEach(item => {
            copyRecursive(path.join(src, item), path.join(dest, item));
          });
        } else if (stats.isFile()) {
          // Copy file
          fs.copyFileSync(src, dest);
          if (!quiet) console.log(`  -> Copied ${src} to ${dest}`);
        }
      }

      if (!quiet) console.log('Copying static files...');
      const items = fs.readdirSync(staticDir);
      items.forEach(item => {
        const srcPath = path.join(staticDir, item);
        const destPath = path.join(outputRootDir, item);
        copyRecursive(srcPath, destPath);
      });
    }

    // Render every page and the sitemap before the output folder is touched,
    // so a failed build leaves the previous output as it was.
    const renderedPages = [];
    for (const pageEntry of pageEntries) {
      renderedPages.push(await renderPage(pageEntry));
    }
    const sitemapXml = buildSitemapXml({ pageEntries, sitemap, globalData });

    // Start build process
    if (!quiet) console.log('Starting build process...');

    // Clean output directory before each build
    cleanOutputDir();

    // Copy static files first (they can be overwritten by pages)
    copyStaticFiles();

    // Write all pages (can overwrite static files)
    renderedPages.forEach(writeRenderedPage);

    // Write the sitemap after pages so it can overwrite static files if configured.
    writeSitemapFile(sitemapXml);

    if (!quiet) console.log('Build complete!');
  };
}
