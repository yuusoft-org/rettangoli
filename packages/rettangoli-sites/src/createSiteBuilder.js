import { convertToHtml } from 'yahtml';
import { parseAndRender } from 'jempl';
import path from 'path';
import { createHash } from 'crypto';
import yaml from 'js-yaml';
import matter from 'gray-matter';

import MarkdownIt from 'markdown-it';
import rtglMarkdown from './rtglMarkdown.js';
import builtinTemplateFunctions from './builtinTemplateFunctions.js';

const MATTER_OPTIONS = {
  engines: {
    yaml: (source) => yaml.load(source, { schema: yaml.JSON_SCHEMA })
  }
};

// Deep merge utility function
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function parseYamlWithContext(content, contextLabel) {
  try {
    return yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    throw new Error(`${contextLabel}: Invalid YAML: ${error.message}`);
  }
}

function buildImportCacheHash(url) {
  return createHash('sha256').update(url).digest('hex');
}

function buildImportCachePath(rootDir, importGroup, hash) {
  return path.join(rootDir, '.rettangoli', 'sites', 'imports', importGroup, `${hash}.yaml`);
}

function buildImportIndexPath(rootDir) {
  return path.join(rootDir, '.rettangoli', 'sites', 'imports', 'index.yaml');
}

function toRelativePath(rootDir, absolutePath) {
  const relativePath = path.relative(rootDir, absolutePath);
  return relativePath.replace(/\\/g, '/');
}

function normalizeImportIndex(rawIndex, indexPath) {
  if (rawIndex == null) {
    return { version: 1, entries: [] };
  }

  if (!isObject(rawIndex)) {
    throw new Error(`Invalid import index "${indexPath}": expected a YAML object.`);
  }

  if (rawIndex.version !== undefined && rawIndex.version !== 1) {
    throw new Error(`Unsupported import index version "${rawIndex.version}" in "${indexPath}".`);
  }

  const rawEntries = rawIndex.entries ?? [];
  if (!Array.isArray(rawEntries)) {
    throw new Error(`Invalid import index "${indexPath}": expected "entries" to be an array.`);
  }

  const entries = rawEntries.map((entry, index) => {
    if (!isObject(entry)) {
      throw new Error(`Invalid import index "${indexPath}" at entries[${index}]: expected an object.`);
    }

    const normalizedEntry = {
      alias: entry.alias,
      type: entry.type,
      url: entry.url,
      hash: entry.hash,
      path: entry.path
    };

    for (const [key, value] of Object.entries(normalizedEntry)) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`Invalid import index "${indexPath}" at entries[${index}].${key}: expected a non-empty string.`);
      }
    }

    return normalizedEntry;
  });

  return { version: 1, entries };
}

function readImportIndex(fs, rootDir) {
  const indexPath = buildImportIndexPath(rootDir);
  if (!fs.existsSync(indexPath)) {
    return { version: 1, entries: [] };
  }

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const parsed = parseYamlWithContext(indexContent, `import index "${indexPath}"`);
  return normalizeImportIndex(parsed, indexPath);
}

function upsertImportIndexEntry(importIndex, entry) {
  const existingIndex = importIndex.entries.findIndex((item) => item.type === entry.type && item.alias === entry.alias);
  if (existingIndex === -1) {
    importIndex.entries.push(entry);
    return;
  }
  importIndex.entries[existingIndex] = entry;
}

function writeImportIndex(fs, rootDir, importIndex) {
  const indexPath = buildImportIndexPath(rootDir);
  const indexDir = path.dirname(indexPath);
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true });
  }

  const sortedEntries = [...importIndex.entries].sort((a, b) => {
    const left = `${a.type}:${a.alias}`;
    const right = `${b.type}:${b.alias}`;
    return left.localeCompare(right);
  });

  const output = {
    version: 1,
    entries: sortedEntries
  };
  fs.writeFileSync(indexPath, yaml.dump(output, { noRefs: true, lineWidth: -1 }));
}

function readImportedYamlFromCache(fs, cachePath, aliasLabel) {
  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const content = fs.readFileSync(cachePath, 'utf8');
  return parseYamlWithContext(content, `${aliasLabel} (cache: ${cachePath})`);
}

async function fetchRemoteYaml(url, fetchImpl, aliasLabel) {
  const effectiveFetch = fetchImpl || globalThis.fetch;
  if (typeof effectiveFetch !== 'function') {
    throw new Error(`${aliasLabel}: Remote imports require global fetch support (Node.js 18+).`);
  }

  const response = await effectiveFetch(url);
  if (!response.ok) {
    throw new Error(`${aliasLabel}: HTTP ${response.status} ${response.statusText}`.trim());
  }

  const content = await response.text();
  const parsed = parseYamlWithContext(content, aliasLabel);
  return { parsed, content };
}

function writeImportedYamlCache(fs, cachePath, content) {
  const cacheDir = path.dirname(cachePath);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  try {
    fs.writeFileSync(cachePath, content);
  } catch (error) {
    // Non-fatal: build can still proceed with fetched content.
  }
}

async function loadImportedAliases({
  fs,
  rootDir,
  importMap,
  importGroup,
  typeLabel,
  fetchImpl,
  importIndex
}) {
  const resolved = {};
  if (!isObject(importMap)) {
    return resolved;
  }

  for (const [alias, url] of Object.entries(importMap)) {
    const aliasLabel = `imported ${typeLabel} "${alias}" from "${url}"`;
    const hash = buildImportCacheHash(url);
    const cachePath = buildImportCachePath(rootDir, importGroup, hash);
    const relativeCachePath = toRelativePath(rootDir, cachePath);

    const cachedValue = readImportedYamlFromCache(fs, cachePath, aliasLabel);
    if (cachedValue !== null) {
      resolved[alias] = cachedValue;
      upsertImportIndexEntry(importIndex, {
        alias,
        type: typeLabel,
        url,
        hash,
        path: relativeCachePath
      });
      continue;
    }

    try {
      const fetched = await fetchRemoteYaml(url, fetchImpl, aliasLabel);
      writeImportedYamlCache(fs, cachePath, fetched.content);
      resolved[alias] = fetched.parsed;
      upsertImportIndexEntry(importIndex, {
        alias,
        type: typeLabel,
        url,
        hash,
        path: relativeCachePath
      });
    } catch (error) {
      throw new Error(`Failed to load ${aliasLabel}: ${error.message}`);
    }
  }

  return resolved;
}

export function createSiteBuilder({
  fs,
  rootDir = '.',
  outputPath = '_site',
  md,
  markdown = {},
  keepMarkdownFiles = false,
  imports = {},
  fetchImpl,
  functions = {},
  quiet = false,
  isScreenshotMode = false
}) {
  return async function build() {
    const templateFunctions = {
      ...builtinTemplateFunctions,
      ...functions
    };

    // Use provided md or default to rtglMarkdown
    const mdInstance = md || rtglMarkdown(MarkdownIt, markdown);
    const absoluteRootDir = path.resolve(rootDir);
    const outputRootDir = path.resolve(rootDir, outputPath);

    function cleanOutputDir() {
      const rootPathInfo = path.parse(absoluteRootDir);
      const outputPathInfo = path.parse(outputRootDir);

      if (outputRootDir === absoluteRootDir) {
        throw new Error(`Refusing to clean output path "${outputPath}" because it resolves to rootDir.`);
      }

      if (outputRootDir === outputPathInfo.root || outputRootDir === rootPathInfo.root) {
        throw new Error(`Refusing to clean output path "${outputPath}" because it resolves to filesystem root.`);
      }

      if (fs.existsSync(outputRootDir)) {
        fs.rmSync(outputRootDir, { recursive: true, force: true });
      }
      fs.mkdirSync(outputRootDir, { recursive: true });
    }

    const importIndex = readImportIndex(fs, rootDir);

    const importedTemplates = await loadImportedAliases({
      fs,
      rootDir,
      importMap: imports.templates,
      importGroup: 'templates',
      typeLabel: 'template',
      fetchImpl,
      importIndex
    });
    const importedPartials = await loadImportedAliases({
      fs,
      rootDir,
      importMap: imports.partials,
      importGroup: 'partials',
      typeLabel: 'partial',
      fetchImpl,
      importIndex
    });

    if (importIndex.entries.length > 0) {
      writeImportIndex(fs, rootDir, importIndex);
    }

    // Read all partials and create a JSON object
    const partialsDir = path.join(rootDir, 'partials');
    const partials = { ...importedPartials };

    function readPartialsRecursively(dir, basePath = '') {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir, { withFileTypes: true });
      items.forEach(item => {
        const itemPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          const newBasePath = basePath ? `${basePath}/${item.name}` : item.name;
          readPartialsRecursively(itemPath, newBasePath);
          return;
        }

        if (!item.isFile() || (!item.name.endsWith('.yaml') && !item.name.endsWith('.yml'))) {
          return;
        }

        const fileContent = fs.readFileSync(itemPath, 'utf8');
        const nameWithoutExt = path.basename(item.name, path.extname(item.name));
        const partialKey = basePath ? `${basePath}/${nameWithoutExt}` : nameWithoutExt;
        partials[partialKey] = yaml.load(fileContent, { schema: yaml.JSON_SCHEMA });
      });
    }

    if (fs.existsSync(partialsDir)) {
      readPartialsRecursively(partialsDir);
    }

    // Read all data files and create a JSON object
    const dataDir = path.join(rootDir, 'data');
    const globalData = {};

    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      files.forEach(file => {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const filePath = path.join(dataDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const nameWithoutExt = path.basename(file, path.extname(file));
          // Load YAML content and store under filename key
          globalData[nameWithoutExt] = yaml.load(fileContent, { schema: yaml.JSON_SCHEMA });
        }
      });
    }

    // Read all templates and create a JSON object
    const templatesDir = path.join(rootDir, 'templates');
    const templates = { ...importedTemplates };

    function readTemplatesRecursively(dir, basePath = '') {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir, { withFileTypes: true });

      items.forEach(item => {
        const itemPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          // Recursively read subdirectories
          const newBasePath = basePath ? `${basePath}/${item.name}` : item.name;
          readTemplatesRecursively(itemPath, newBasePath);
        } else if (item.isFile() && (item.name.endsWith('.yaml') || item.name.endsWith('.yml'))) {
          // Read and convert YAML file
          const fileContent = fs.readFileSync(itemPath, 'utf8');
          const nameWithoutExt = path.basename(item.name, path.extname(item.name));
          const templateKey = basePath ? `${basePath}/${nameWithoutExt}` : nameWithoutExt;
          templates[templateKey] = yaml.load(fileContent, { schema: yaml.JSON_SCHEMA });
        }
      });
    }

    readTemplatesRecursively(templatesDir);

    // Parse frontmatter only when it is truly at the file start.
    function extractFrontmatterAndContent(pagePath) {
      const pageFileContent = fs.readFileSync(pagePath, 'utf8');
      let parsed;
      try {
        parsed = matter(pageFileContent, MATTER_OPTIONS);
      } catch (error) {
        throw new Error(`Invalid frontmatter in ${pagePath}: ${error.message}`);
      }

      return {
        frontmatter: isObject(parsed.data) ? parsed.data : {},
        content: (parsed.content || '').trim()
      };
    }

    // Function to scan all pages and build collections
    function buildCollections() {
      const collections = {};
      const pagesDir = path.join(rootDir, 'pages');

      function scanPages(dir, basePath = '') {
        const fullDir = path.join(pagesDir, basePath);
        if (!fs.existsSync(fullDir)) return;

        const items = fs.readdirSync(fullDir, { withFileTypes: true });

        for (const item of items) {
          const itemPath = path.join(fullDir, item.name);
          const relativePath = basePath ? path.join(basePath, item.name) : item.name;

          if (item.isDirectory()) {
            // Recursively scan subdirectories
            scanPages(dir, relativePath);
          } else if (item.isFile() && (item.name.endsWith('.yaml') || item.name.endsWith('.yml') || item.name.endsWith('.md'))) {
            // Extract frontmatter and content
            const { frontmatter, content } = extractFrontmatterAndContent(itemPath);

            // Calculate URL
            const baseFileName = item.name.replace(/\.(yaml|yml|md)$/, '');
            let url;

            // Special case: index files remain at root, others become directories
            if (baseFileName === 'index') {
              url = basePath ? '/' + basePath.replace(/\\/g, '/') : '/';
              if (url !== '/') {
                url = url + '/';
              }
            } else {
              const pagePath = basePath ? path.join(basePath, baseFileName) : baseFileName;
              url = '/' + pagePath.replace(/\\/g, '/') + '/';
            }

            // Process tags
            if (frontmatter.tags) {
              // Normalize tags to array
              const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];

              // Add to collections
              tags.forEach(tag => {
                if (typeof tag === 'string' && tag.trim()) {
                  const trimmedTag = tag.trim();
                  if (!collections[trimmedTag]) {
                    collections[trimmedTag] = [];
                  }
                  collections[trimmedTag].push({
                    data: frontmatter,
                    url: url,
                    content: content
                  });
                }
              });
            }
          }
        }
      }

      scanPages('');
      return collections;
    }

    // Build collections in first pass
    if (!quiet) console.log('Building collections...');
    const collections = buildCollections();

    // Function to process a single page file
    async function processPage(pagePath, outputRelativePath, isMarkdown = false, markdownOutputRelativePath = null) {
      if (!quiet) console.log(`Processing ${pagePath}...`);

      const { frontmatter, content: rawContent } = extractFrontmatterAndContent(pagePath);

      // Calculate URL for current page
      let url;
      const fileName = path.basename(outputRelativePath, '.html');
      const basePath = path.dirname(outputRelativePath);

      // Special case: index files remain at root, others become directories
      if (fileName === 'index') {
        url = basePath && basePath !== '.' ? '/' + basePath.replace(/\\/g, '/') : '/';
        if (url !== '/') {
          url = url + '/';
        }
      } else {
        const pagePath = basePath && basePath !== '.' ? path.join(basePath, fileName) : fileName;
        url = '/' + pagePath.replace(/\\/g, '/') + '/';
      }

      // Deep merge global data with frontmatter and collections for the page context
      const pageData = deepMerge(globalData, frontmatter);
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
          throw new Error(`Invalid YAML page content in ${pagePath}: ${error.message}`);
        }
        // Process the page content to resolve any $partial references with page data
        processedPageContent = parseAndRender(pageContent, pageData, { partials, functions: templateFunctions });
      }

      // Find the template specified in frontmatter
      let templateToUse = null;
      if (frontmatter.template) {
        // Look up template by exact path
        templateToUse = templates[frontmatter.template];
        if (!templateToUse) {
          throw new Error(`Template "${frontmatter.template}" not found in ${pagePath}. Available templates: ${Object.keys(templates).join(', ')}`);
        }
      }

      // Use the template with jempl to render the processed page content
      let htmlString;

      if (isMarkdown) {
        if (templateToUse) {
          // For markdown with template, use a placeholder and replace after
          const placeholder = `___MARKDOWN_CONTENT_PLACEHOLDER_${Math.random().toString(36).slice(2)}___`;
          const templateData = { ...pageData, content: placeholder, collections };
          const templateResult = parseAndRender(templateToUse, templateData, { partials, functions: templateFunctions });
          htmlString = convertToHtml(templateResult);
          // Replace all placeholders with actual markdown HTML content.
          htmlString = htmlString.split(placeholder).join(processedPageContent.__html);
        } else {
          // Markdown without template - use HTML directly
          htmlString = processedPageContent.__html;
        }
      } else {
        // YAML content
        const templateData = { ...pageData, content: processedPageContent, collections };
        const result = templateToUse
          ? parseAndRender(templateToUse, templateData, { partials, functions: templateFunctions })
          : processedPageContent;
        // Ensure result is an array for convertToHtml
        const resultArray = Array.isArray(result) ? result : [result];
        htmlString = convertToHtml(resultArray);
      }

      // Create output directory and file path for new index.html structure
      const pageFileName = path.basename(outputRelativePath, '.html');
      const dirPath = path.dirname(outputRelativePath);

      let outputPath, outputDir;

      // Special case: index files remain as index.html, others become directory/index.html
      if (pageFileName === 'index') {
        if (dirPath && dirPath !== '.') {
          // Nested index file: pages/blog/index.yaml -> _site/blog/index.html
          outputPath = path.join(outputRootDir, dirPath, 'index.html');
          outputDir = path.join(outputRootDir, dirPath);
        } else {
          // Root index file: pages/index.yaml -> _site/index.html
          outputPath = path.join(outputRootDir, 'index.html');
          outputDir = path.join(outputRootDir);
        }
      } else {
        // Regular file: pages/test.yaml -> _site/test/index.html
        if (dirPath && dirPath !== '.') {
          // Nested regular file: pages/blog/post.yaml -> _site/blog/post/index.html
          outputPath = path.join(outputRootDir, dirPath, pageFileName, 'index.html');
          outputDir = path.join(outputRootDir, dirPath, pageFileName);
        } else {
          // Root level regular file: pages/test.yaml -> _site/test/index.html
          outputPath = path.join(outputRootDir, pageFileName, 'index.html');
          outputDir = path.join(outputRootDir, pageFileName);
        }
      }

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write HTML to output file
      fs.writeFileSync(outputPath, htmlString);
      if (!quiet) console.log(`  -> Written to ${outputPath}`);

      if (isMarkdown && keepMarkdownFiles && typeof markdownOutputRelativePath === 'string') {
        const markdownOutputPath = path.join(outputRootDir, markdownOutputRelativePath);
        const markdownOutputDir = path.dirname(markdownOutputPath);
        if (!fs.existsSync(markdownOutputDir)) {
          fs.mkdirSync(markdownOutputDir, { recursive: true });
        }
        fs.copyFileSync(pagePath, markdownOutputPath);
        if (!quiet) console.log(`  -> Copied markdown to ${markdownOutputPath}`);
      }
    }

    // Process all YAML and Markdown files in pages directory recursively
    async function processAllPages(dir, basePath = '') {
      const pagesDir = path.join(rootDir, 'pages');
      const fullDir = path.join(pagesDir, basePath);

      if (!fs.existsSync(fullDir)) return;

      const items = fs.readdirSync(fullDir, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(fullDir, item.name);
        const relativePath = basePath ? path.join(basePath, item.name) : item.name;

        if (item.isDirectory()) {
          // Recursively process subdirectories
          await processAllPages(dir, relativePath);
        } else if (item.isFile()) {
          if (item.name.endsWith('.yaml') || item.name.endsWith('.yml')) {
            // Process YAML file
            const outputFileName = item.name.replace(/\.(yaml|yml)$/, '.html');
            const outputRelativePath = basePath ? path.join(basePath, outputFileName) : outputFileName;
            await processPage(itemPath, outputRelativePath, false);
          } else if (item.name.endsWith('.md')) {
            // Process Markdown file
            const outputFileName = item.name.replace('.md', '.html');
            const outputRelativePath = basePath ? path.join(basePath, outputFileName) : outputFileName;
            await processPage(itemPath, outputRelativePath, true, relativePath);
          }
          // Ignore other file types
        }
      }
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

    // Start build process
    if (!quiet) console.log('Starting build process...');

    // Clean output directory before each build
    cleanOutputDir();

    // Copy static files first (they can be overwritten by pages)
    copyStaticFiles();

    // Process all pages (can overwrite static files)
    await processAllPages('');

    if (!quiet) console.log('Build complete!');
  };
}
