import { convertToHtml } from 'yahtml';
import { parseAndRender } from 'jempl';
import path from 'path';
import yaml from 'js-yaml';

import MarkdownIt from 'markdown-it';

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

export function createSiteBuilder({ fs, rootDir = '.', mdRender, functions = {}, quiet = false }) {
  return function build() {
    // Use provided mdRender or default to standard markdown-it
    const md = mdRender || MarkdownIt();

    // Read all partials and create a JSON object
    const partialsDir = path.join(rootDir, 'partials');
    const partials = {};

    if (fs.existsSync(partialsDir)) {
      const files = fs.readdirSync(partialsDir);
      files.forEach(file => {
        const filePath = path.join(partialsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const nameWithoutExt = path.basename(file, path.extname(file));
        // Convert partial content from YAML string to JSON
        partials[nameWithoutExt] = yaml.load(fileContent, { schema: yaml.JSON_SCHEMA });
      });
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
    const templates = {};

    function readTemplatesRecursively(dir, basePath = '') {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir, { withFileTypes: true });

      items.forEach(item => {
        const itemPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          // Recursively read subdirectories
          const newBasePath = basePath ? `${basePath}/${item.name}` : item.name;
          readTemplatesRecursively(itemPath, newBasePath);
        } else if (item.isFile() && item.name.endsWith('.yaml')) {
          // Read and convert YAML file
          const fileContent = fs.readFileSync(itemPath, 'utf8');
          const nameWithoutExt = path.basename(item.name, '.yaml');
          const templateKey = basePath ? `${basePath}/${nameWithoutExt}` : nameWithoutExt;
          templates[templateKey] = yaml.load(fileContent, { schema: yaml.JSON_SCHEMA });
        }
      });
    }

    readTemplatesRecursively(templatesDir);

    // Function to extract frontmatter from a page file
    function extractFrontmatter(pagePath) {
      const pageFileContent = fs.readFileSync(pagePath, 'utf8');
      const lines = pageFileContent.split('\n');
      let frontmatterStart = -1;
      let frontmatterEnd = -1;
      let frontmatterCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          frontmatterCount++;
          if (frontmatterCount === 1) {
            frontmatterStart = i + 1;
          } else if (frontmatterCount === 2) {
            frontmatterEnd = i;
            break;
          }
        }
      }

      let frontmatter = {};
      if (frontmatterStart > 0 && frontmatterEnd > frontmatterStart) {
        const frontmatterContent = lines.slice(frontmatterStart, frontmatterEnd).join('\n');
        frontmatter = yaml.load(frontmatterContent, { schema: yaml.JSON_SCHEMA }) || {};
      }

      return frontmatter;
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
          } else if (item.isFile() && (item.name.endsWith('.yaml') || item.name.endsWith('.md'))) {
            // Extract frontmatter
            const frontmatter = extractFrontmatter(itemPath);

            // Calculate URL
            const outputFileName = item.name.replace(/\.(yaml|md)$/, '.html');
            const outputRelativePath = basePath ? path.join(basePath, outputFileName) : outputFileName;
            let url = '/' + outputRelativePath.replace(/\\/g, '/').replace(/\.html$/, '');
            // Special case: /index becomes /
            if (url === '/index') {
              url = '/';
            } else {
              // Add trailing slash for all non-root URLs
              url = url + '/';
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
                    url: url
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
    console.log('Building collections...');
    const collections = buildCollections();

    // Function to process a single page file
    function processPage(pagePath, outputRelativePath, isMarkdown = false) {
      if (!quiet) console.log(`Processing ${pagePath}...`);

      // Read page content
      const pageFileContent = fs.readFileSync(pagePath, 'utf8');

      // Extract frontmatter and content
      const lines = pageFileContent.split('\n');
      let frontmatterStart = -1;
      let frontmatterEnd = -1;
      let frontmatterCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          frontmatterCount++;
          if (frontmatterCount === 1) {
            frontmatterStart = i + 1;
          } else if (frontmatterCount === 2) {
            frontmatterEnd = i;
            break;
          }
        }
      }

      // Store frontmatter
      let frontmatter = {};
      if (frontmatterStart > 0 && frontmatterEnd > frontmatterStart) {
        const frontmatterContent = lines.slice(frontmatterStart, frontmatterEnd).join('\n');
        frontmatter = yaml.load(frontmatterContent, { schema: yaml.JSON_SCHEMA }) || {};
      }

      // Get content after frontmatter
      const contentStart = frontmatterEnd + 1;
      const rawContent = lines.slice(contentStart).join('\n').trim();

      // Calculate URL for current page
      let url = '/' + outputRelativePath.replace(/\\/g, '/').replace(/\.html$/, '');
      // Special case: /index becomes /
      if (url === '/index') {
        url = '/';
      } else {
        // Add trailing slash for all non-root URLs
        url = url + '/';
      }

      // Deep merge global data with frontmatter and collections for the page context
      const pageData = deepMerge(globalData, frontmatter);
      pageData.collections = collections;
      pageData.page = { url };

      let processedPageContent;

      if (isMarkdown) {
        // Process markdown content with MarkdownIt
        const htmlContent = md.render(rawContent);
        // For markdown, store as raw HTML that will be inserted directly
        processedPageContent = { __html: htmlContent };
      } else {
        // Convert YAML content to JSON
        const pageContent = yaml.load(rawContent, { schema: yaml.JSON_SCHEMA });
        // Process the page content to resolve any $partial references with page data
        processedPageContent = parseAndRender(pageContent, pageData, { partials, functions });
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
          const placeholder = '___MARKDOWN_CONTENT_PLACEHOLDER___';
          const templateData = { ...pageData, content: placeholder, collections };
          const templateResult = parseAndRender(templateToUse, templateData, { partials, functions });
          htmlString = convertToHtml(templateResult);
          // Replace the placeholder with actual HTML content
          htmlString = htmlString.replace(placeholder, processedPageContent.__html);
        } else {
          // Markdown without template - use HTML directly
          htmlString = processedPageContent.__html;
        }
      } else {
        // YAML content
        const templateData = { ...pageData, content: processedPageContent, collections };
        const result = templateToUse
          ? parseAndRender(templateToUse, templateData, { partials, functions })
          : processedPageContent;
        // Ensure result is an array for convertToHtml
        const resultArray = Array.isArray(result) ? result : [result];
        htmlString = convertToHtml(resultArray);
      }

      // Create output directory if it doesn't exist
      const outputPath = path.join(rootDir, '_site', outputRelativePath);
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write HTML to output file
      fs.writeFileSync(outputPath, htmlString);
      if (!quiet) console.log(`  -> Written to ${outputPath}`);
    }

    // Process all YAML and Markdown files in pages directory recursively
    function processAllPages(dir, basePath = '') {
      const pagesDir = path.join(rootDir, 'pages');
      const fullDir = path.join(pagesDir, basePath);

      if (!fs.existsSync(fullDir)) return;

      const items = fs.readdirSync(fullDir, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(fullDir, item.name);
        const relativePath = basePath ? path.join(basePath, item.name) : item.name;

        if (item.isDirectory()) {
          // Recursively process subdirectories
          processAllPages(dir, relativePath);
        } else if (item.isFile()) {
          if (item.name.endsWith('.yaml')) {
            // Process YAML file
            const outputFileName = item.name.replace('.yaml', '.html');
            const outputRelativePath = basePath ? path.join(basePath, outputFileName) : outputFileName;
            processPage(itemPath, outputRelativePath, false);
          } else if (item.name.endsWith('.md')) {
            // Process Markdown file
            const outputFileName = item.name.replace('.md', '.html');
            const outputRelativePath = basePath ? path.join(basePath, outputFileName) : outputFileName;
            processPage(itemPath, outputRelativePath, true);
          }
          // Ignore other file types
        }
      }
    }

    // Function to copy static files recursively
    function copyStaticFiles() {
      const staticDir = path.join(rootDir, 'static');
      const outputDir = path.join(rootDir, '_site');

      if (!fs.existsSync(staticDir)) {
        return;
      }

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
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
        const destPath = path.join(outputDir, item);
        copyRecursive(srcPath, destPath);
      });
    }

    // Start build process
    if (!quiet) console.log('Starting build process...');

    // Copy static files first (they can be overwritten by pages)
    copyStaticFiles();

    // Process all pages (can overwrite static files)
    processAllPages('');

    if (!quiet) console.log('Build complete!');
  };
}
