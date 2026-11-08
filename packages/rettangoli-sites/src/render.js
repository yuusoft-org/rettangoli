import { convertToHtml } from 'yahtml';
import { parseAndRender } from 'jempl';
import path from 'path';
import yaml from 'js-yaml';

import builtinTemplateFunctions from './builtinTemplateFunctions.js';
import { createRenderComponentFunction } from './componentRenderer.js';
import { htmlOutputRelativePathFromUrl, markdownOutputRelativePathForPage } from './routes.js';
import { deepMerge } from './utils/object.js';

// Template functions for one page: the built-ins, renderComponent, then the site's own functions.
// context: { componentRegistry, functions }
export function createTemplateFunctions({ componentRegistry, functions }, pageLabel) {
  return {
    ...builtinTemplateFunctions,
    renderComponent: createRenderComponentFunction({ componentRegistry, pageLabel }),
    ...functions
  };
}

// yahtml flattens nested lists among an element's children (a $for, a list $partial, a multi-item $if)
// but renders nothing for a nested list at the root, so flatten the root list the same way.
// A result that is not a list is passed through, so convertToHtml still rejects it.
function toRootList(result) {
  return Array.isArray(result) ? result.flat(Infinity) : result;
}

// Render one page in memory, without progress logs or file writes.
// context: { md, globalData, partials, templates, collections, componentRegistry, functions,
//            isScreenshotMode, keepMarkdownFiles, outputRootDir }
export async function renderPage(context, pageEntry) {
  const {
    md,
    globalData,
    partials,
    templates,
    collections,
    isScreenshotMode,
    keepMarkdownFiles,
    outputRootDir
  } = context;
  const {
    pagePath,
    pageLabel,
    content: rawContent,
    frontmatter: publicFrontmatter,
    bindings: boundData,
    isMarkdown,
    url,
    unclosedFrontmatter
  } = pageEntry;

  const templateFunctions = createTemplateFunctions(context, pageLabel);
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
    if(md.renderAsync){
      htmlContent = await md.renderAsync(rawContent);
    } else {
      htmlContent = md.render(rawContent);
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
    markdownCopy = { from: pagePath, to: path.join(outputRootDir, ...markdownOutputRelativePathForPage(pageEntry).split('/')) };
  }

  return { pageLabel, outputPath, html: htmlString, markdownCopy };
}
