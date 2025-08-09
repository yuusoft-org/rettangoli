import { convertToHtml } from 'yahtml';
import { parseAndRender } from 'jempl';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import MarkdownIt from './markdownItAsync.js';

// Read all partials and create a JSON object
const partialsDir = './partials';
const partials = {};

// Simple slug generation function
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Configure Markdown renderer with custom elements and styling
 */
const configureMarkdown = ({ yamlComponentRenderer }) => {
  const md = MarkdownIt({
    async highlight(code, lang, attrs) {
      if (attrs.includes("components")) {
        try {
          return yamlComponentRenderer(code);
        } catch (error) {
          console.error(error);
          process.exit(1);
        }
      }
      if (attrs.includes("codePreview")) {
        const formattedCode = await codeToHtml(code, {
          lang,
          theme: "slack-dark",
        });
        return `
        <rtgl-view w="f" bw="xs" br="md">
          <rtgl-view w="f" p="lg">
          ${code}
          </rtgl-view>
          <rtgl-view h="1" w="f" bgc="bo"></rtgl-view>
          <rtgl-view w="f" d="h">
          ${formattedCode}
          </rtgl-view>
        </rtgl-view>`
          ;
      }
      return await codeToHtml(code, { lang, theme: "slack-dark" });
    },
    warnOnSyncRender: true,
  });

  // Header configuration
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const level = token.markup.length;
    const inlineToken = tokens[idx + 1];
    const headingText = inlineToken.content;
    const id = generateSlug(headingText);

    // Map heading levels to size values
    const sizes = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" };
    const size = sizes[level] || "md";

    return `<rtgl-text id="${id}" mt="lg" s="${size}" mb="md"> <a href="#${id}" style="display: contents;">`;
  };

  md.renderer.rules.heading_close = () => "</a></rtgl-text>\n";

  // Paragraph configuration
  md.renderer.rules.paragraph_open = () => `<rtgl-text s="bl" mb="lg">`;
  md.renderer.rules.paragraph_close = () => "</rtgl-text>\n";

  // Table configuration
  md.renderer.rules.table_open = () => '<rtgl-view w="f">\n<table>';
  md.renderer.rules.table_close = () => "</table>\n</rtgl-view>";

  // Link configuration - add target="_blank" to all external links
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const targetIndex = token.attrIndex("target");
    const href =
      (token.attrs && token.attrs.find((attr) => attr[0] === "href")?.[1]) ||
      "";
    const isExternal = href.startsWith("http") || href.startsWith("//");

    // If this is an external link or already has target="_blank"
    if (isExternal || targetIndex >= 0) {
      if (targetIndex < 0) {
        token.attrPush(["target", "_blank"]);
      }
      token.attrPush(["rel", "noreferrer"]);

      // Find the next text token to use for the aria-label
      let nextIdx = idx + 1;
      let textContent = "";
      while (nextIdx < tokens.length && tokens[nextIdx].type !== "link_close") {
        if (tokens[nextIdx].type === "text") {
          textContent += tokens[nextIdx].content;
        }
        nextIdx++;
      }

      // Add aria-label for external links
      if (textContent.trim() && token.attrIndex("aria-label") < 0) {
        token.attrPush([
          "aria-label",
          `${textContent.trim()} (opens in new tab)`,
        ]);
      }
    }

    return self.renderToken(tokens, idx, options);
  };

  return md;
};

const md = configureMarkdown({});


if (fs.existsSync(partialsDir)) {
  const files = fs.readdirSync(partialsDir);
  files.forEach(file => {
    const filePath = path.join(partialsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const nameWithoutExt = path.basename(file, path.extname(file));
    // Convert partial content from YAML string to JSON
    partials[nameWithoutExt] = yaml.load(fileContent);
  });
}

// Read all data files and create a JSON object
const dataDir = './data';
const globalData = {};

if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  files.forEach(file => {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const filePath = path.join(dataDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const nameWithoutExt = path.basename(file, path.extname(file));
      // Load YAML content and store under filename key
      globalData[nameWithoutExt] = yaml.load(fileContent);
    }
  });
}

// Read all templates and create a JSON object
const templatesDir = './templates';
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
      templates[templateKey] = yaml.load(fileContent);
    }
  });
}

readTemplatesRecursively(templatesDir);


// Function to process a single page file
async function processPage(pagePath, outputRelativePath, isMarkdown = false) {
  console.log(`Processing ${pagePath}...`);

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
    frontmatter = yaml.load(frontmatterContent) || {};
  }

  // Get content after frontmatter
  const contentStart = frontmatterEnd + 1;
  const rawContent = lines.slice(contentStart).join('\n').trim();

  // Merge global data with frontmatter for the page context
  const pageData = { ...globalData, ...frontmatter };

  let processedPageContent;

  if (isMarkdown) {
    // Process markdown content with MarkdownIt
    const htmlContent = await md.renderAsync(rawContent);
    // For markdown, store as raw HTML that will be inserted directly
    processedPageContent = { __html: htmlContent };
  } else {
    // Convert YAML content to JSON
    const pageContent = yaml.load(rawContent);
    // Process the page content to resolve any $partial references with page data
    processedPageContent = parseAndRender(pageContent, pageData, { partials });
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
      const templateData = { ...pageData, content: placeholder };
      const templateResult = parseAndRender(templateToUse, templateData, { partials });
      htmlString = convertToHtml(templateResult);
      // Replace the placeholder with actual HTML content
      htmlString = htmlString.replace(placeholder, processedPageContent.__html);
    } else {
      // Markdown without template - use HTML directly
      htmlString = processedPageContent.__html;
    }
  } else {
    // YAML content
    const templateData = { ...pageData, content: processedPageContent };
    const result = templateToUse
      ? parseAndRender(templateToUse, templateData, { partials })
      : processedPageContent;
    htmlString = convertToHtml(result);
  }

  // Create output directory if it doesn't exist
  const outputPath = path.join('./_site', outputRelativePath);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write HTML to output file
  fs.writeFileSync(outputPath, htmlString);
  console.log(`  -> Written to ${outputPath}`);
}

// Process all YAML and Markdown files in pages directory recursively
async function processAllPages(dir, basePath = '') {
  const pagesDir = './pages';
  const fullDir = path.join(pagesDir, basePath);

  if (!fs.existsSync(fullDir)) return;

  const items = fs.readdirSync(fullDir, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(fullDir, item.name);
    const relativePath = basePath ? path.join(basePath, item.name) : item.name;

    if (item.isDirectory()) {
      // Recursively process subdirectories
      await processAllPages(fullDir, relativePath);
    } else if (item.isFile()) {
      if (item.name.endsWith('.yaml')) {
        // Process YAML file
        const outputFileName = item.name.replace('.yaml', '.html');
        const outputRelativePath = basePath ? path.join(basePath, outputFileName) : outputFileName;
        await processPage(itemPath, outputRelativePath, false);
      } else if (item.name.endsWith('.md')) {
        // Process Markdown file
        const outputFileName = item.name.replace('.md', '.html');
        const outputRelativePath = basePath ? path.join(basePath, outputFileName) : outputFileName;
        await processPage(itemPath, outputRelativePath, true);
      }
      // Ignore other file types
    }
  }
}

// Process all pages
(async () => {
  console.log('Starting build process...');
  await processAllPages('./pages');
  console.log('Build complete!');
})();

