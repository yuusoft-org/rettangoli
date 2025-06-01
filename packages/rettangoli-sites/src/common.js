import {
  readFile,
  mkdir,
  readdir,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { minify } from "html-minifier-terser";
import yaml from "js-yaml";
import { Liquid } from "liquidjs";
import MarkdownIt from "./markdownItAsync.js";
import { codeToHtml } from "shiki";

// Try to get CleanCSS from html-minifier-terser's dependencies
import CleanCSS from "clean-css";

/**
 * Helper function to safely load YAML
 * @param {string} content - YAML content to parse
 * @param {object} defaultValue - Default value to return on error
 * @returns {object} Parsed YAML object or default value
 */
export const safeYamlLoad = (content, defaultValue = {}) => {
  try {
    return yaml.load(content) || defaultValue;
  } catch (error) {
    console.error("Error parsing YAML:", error);
    return defaultValue;
  }
};

/**
 * Helper function to read a file safely
 * @param {string} filePath - Path to the file
 * @param {string} encoding - File encoding
 * @returns {Promise<string>} File contents or empty string on error
 */
export const safeReadFile = async (filePath, encoding = "utf8") => {
  try {
    // @ts-ignore - Node.js fs types issue
    return await readFile(filePath, encoding);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return "";
  }
};

// Helper function to convert text to a URL-friendly ID
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .trim();
};

/**
 * Extract frontmatter from content
 * @param {string} content - Content with potential frontmatter
 * @returns {object} Object with frontmatter and remaining content
 */
const extractFrontmatter = (content) => {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n/m);
  let frontmatter = {};
  let contentWithoutFrontmatter = content;

  if (frontmatterMatch) {
    frontmatter = safeYamlLoad(frontmatterMatch[1]);
    contentWithoutFrontmatter = content
      .substring(frontmatterMatch[0].length)
      .trim();
  }

  return { frontmatter, content: contentWithoutFrontmatter };
};

// Function to generate table of contents from markdown content
const generateTableOfContents = (content) => {
  // Regular expression to match headings (# Heading1, ## Heading2, etc.)
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const matches = [...content.matchAll(headingRegex)];

  // Root of the table of contents
  const tableOfContents = [];

  // Stack to keep track of the current path in the hierarchy
  const stack = [{ level: 0, items: tableOfContents }];

  for (const match of matches) {
    const level = match[1].length; // Number of # symbols
    const title = match[2].trim();
    const id = generateSlug(title); // Generate ID from title

    // Find the appropriate parent for this heading
    while (stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    // Create new heading item with title and id
    const newItem = { title, id, items: [] };

    // Add to parent's items
    stack[stack.length - 1].items.push(newItem);

    // Push this item to stack so its children can be added to it
    stack.push({ level, items: newItem.items });
  }

  return tableOfContents;
};

// Helper to check if value is an object
export const isObject = (item) => {
  return item && typeof item === "object" && !Array.isArray(item);
};

// Helper function for deep merging objects
export const deepMerge = (target, ...sources) => {
  // Create a clone of the target to avoid mutation
  const result = isObject(target) ? { ...target } : target;

  if (!sources.length) return result;
  const source = sources.shift();

  if (isObject(result) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        // Create or use existing object (without mutation)
        result[key] = result[key] || {};
        // Recursively merge the nested object
        result[key] = deepMerge(result[key], source[key]);
      } else {
        // Simple assignment for non-objects
        result[key] = source[key];
      }
    }
  }

  // Process any remaining sources recursively
  return sources.length ? deepMerge(result, ...sources) : result;
};

export const createTemplateRenderer = (options = {}) => {
  const { filters, templates } = options;

  // Setup LiquidJS engine
  const engine = new Liquid({
    templates,
    strictFilters: true,
    cache: true,
  });

  Object.entries(filters).forEach(([key, value]) => {
    engine.registerFilter(key, value);
  });

  return (template, data) => {
    const tpl = engine.parse(template);

    return engine.renderSync(tpl, data);
  };
};

export const createFolderIfNotExists = async (folder) => {
  try {
    await mkdir(folder, { recursive: true });
    console.log(`Created folder: ${folder}`);
  } catch (error) {
    console.error(`Error creating folder ${folder}:`, error);
  }
};

// Helper function to generate URL from file path
const generateUrlFromPath = (basePath, filePath) => {
  // Normalize basePath to ensure consistent handling
  const normalizedBasePath = basePath.endsWith("/") ? basePath : basePath + "/";

  // Calculate URL using path operations for robustness
  let relativePath = "";

  // Remove any reference to the basePath directory
  if (filePath.includes(normalizedBasePath)) {
    relativePath = filePath.split(normalizedBasePath)[1] || "";
  } else if (filePath.includes(normalizedBasePath.substring(1))) {
    // Handle case without leading dot or slash
    relativePath = filePath.split(normalizedBasePath.substring(1))[1] || "";
  } else if (filePath.includes(normalizedBasePath.replace("./", ""))) {
    // Handle case without leading ./
    relativePath =
      filePath.split(normalizedBasePath.replace("./", ""))[1] || "";
  } else {
    relativePath = filePath;
  }

  // Process the path and ensure it starts with '/'
  let url = relativePath
    .replace(/\.md$/, "") // Remove .md extension
    .replace(/\/index$/, ""); // Remove /index from end

  // Ensure URL starts with '/'
  if (!url.startsWith("/")) {
    url = "/" + url;
  }

  // Handle root case
  if (url === "") {
    url = "/";
  }

  if (url === "/index") {
    url = "/";
  }

  // Ensure URL ends with '/' unless it's the root URL which already has it
  if (url !== "/" && !url.endsWith("/")) {
    url = url + "/";
  }

  return url;
};

/**
 * Configure Markdown renderer with custom elements and styling
 */
export const configureMarkdown = ({ yamlComponentRenderer }) => {
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

/**
 * Loads files from a directory and returns their contents as an object (synchronous version)
 * Supports recursive loading of nested directories when recursive=true
 *
 * @param {Object} options - Configuration options
 * @param {string} options.path - Directory path to load files from
 * @param {string} options.name - Name of the collection for logging purposes
 * @param {boolean} options.isYaml - Whether to parse files as YAML
 * @param {boolean} [options.recursive=false] - Whether to recursively load nested directories
 * @param {boolean} [options.keepExtension=false] - Whether to keep file extensions in the keys
 * @returns {Object} Object with path-based keys (e.g. 'core/t1' or 'core/t1.html' if keepExtension is true)
 *
 * @example
 * // Load all HTML files from /templates directory
 * const templates = loadItemsSync({
 *   path: './templates',
 *   name: 'templates',
 *   isYaml: false
 * });
 *
 * @example
 * // Load all YAML files from /data directory recursively
 * const data = loadItemsSync({
 *   path: './data',
 *   name: 'data files',
 *   isYaml: true,
 *   recursive: true,
 *   keepExtension: true
 * });
 * // Result with keepExtension=false: { 'core/t1': "<html content>" }
 * // Result with keepExtension=true: { 'core/t1.html': "<html content>" }
 */
export const loadItems = ({
  path,
  name,
  isYaml,
  recursive = true,
  keepExtension = false,
}) => {
  const result = {};

  // Normalize path to remove trailing slash
  const basePath = path.endsWith("/") ? path.slice(0, -1) : path;

  /**
   * Helper function to recursively process directories and files
   * @param {string} currentPath - Current directory path being processed
   * @param {string[]} pathSegments - Array of path segments for creating keys
   */
  const processDirectory = (currentPath, pathSegments = []) => {
    try {
      // Check if directory exists
      if (!existsSync(currentPath)) {
        console.error(`Directory not found: ${currentPath}`);
        return;
      }

      // Use synchronous versions of fs functions
      const entries = readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = join(currentPath, entry.name);

        if (entry.isDirectory() && recursive) {
          // Process the subdirectory recursively with updated path segments
          processDirectory(entryPath, [...pathSegments, entry.name]);
        } else if (!entry.isDirectory()) {
          let keyName;
          if (keepExtension) {
            // Keep the full filename with extension
            keyName = entry.name;
          } else {
            // Remove file extension
            keyName = entry.name.replace(/\.[^/.]+$/, "");
          }

          // Use synchronous file read with error handling
          let content;
          try {
            content = readFileSync(entryPath, "utf8");
          } catch (err) {
            console.error(`Error reading file ${entryPath}:`, err);
            continue;
          }

          // Create path-based key
          const key =
            pathSegments.length > 0
              ? [...pathSegments, keyName].join("/")
              : keyName;

          // Store content with the path-based key
          result[key] = isYaml ? safeYamlLoad(content) : content;
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${currentPath}:`, error);
    }
  };

  // Start the recursive processing
  processDirectory(basePath);

  // Log keys for debugging
  console.log(
    `Loaded ${Object.keys(result).length} ${name}: ${Object.keys(result).join(
      ", "
    )}`
  );

  return result;
};

/**
 * Parse throught all nested files under ./pages and that have .md file extension
 * Extract front matter into an object
 * Add 2 things to the frontmatter:
 *  - content: the content of the file without frontmatter
 *  - url: the url of the file without file extension
 * Parse throught frontMatter.tags (which is an array of strings)
 * collections[tag] = [] should have all the frontmatter with that tag
 */
export const loadCollections = async (basePath) => {
  /** @type {{ all: any[], [key: string]: any[] }} */
  const collections = {
    all: [], // Special collection for all items
  };

  // Helper function to recursively find all .md files
  const findMarkdownFiles = async (dir) => {
    const files = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findMarkdownFiles(fullPath)));
      } else if (entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
    return files;
  };

  try {
    // Find all markdown files
    const markdownFiles = await findMarkdownFiles(basePath);

    for (const filePath of markdownFiles) {
      // Read file content
      const content = await safeReadFile(filePath);

      // Extract frontmatter and content
      const {
        frontmatter: frontmatterData,
        content: contentWithoutFrontmatter,
      } = extractFrontmatter(content);

      // Calculate URL using the helper function
      const url = generateUrlFromPath(basePath, filePath);

      // Add content and url to frontmatter
      const pageData = {
        ...frontmatterData,
        content: contentWithoutFrontmatter,
        url,
      };

      // Add to the 'all' collection
      collections.all.push(pageData);

      // Process tags if they exist
      if (Array.isArray(pageData.tags)) {
        for (const tag of pageData.tags) {
          if (!collections[tag]) {
            collections[tag] = [];
          }
          collections[tag].push(pageData);
        }
      } else {
        // Add to 'untagged' collection if no tags
        if (!collections.untagged) {
          collections.untagged = [];
        }
        collections.untagged.push(pageData);
      }
    }

    // Sort collections by date if available
    for (const tag in collections) {
      collections[tag].sort((a, b) => {
        // If both items have dates, sort by date (descending)
        if (a.date && b.date) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
    }

    console.log(`Processed ${markdownFiles.length} markdown files`);
    console.log(`Found ${Object.keys(collections).length} collections`);

    return collections;
  } catch (error) {
    console.error("Error loading collections:", error);
    return { all: [] };
  }
};

export const createFileFormatHandlers = ({
  basePath,
  templates,
  liquidParse,
  collections,
  data,
  md,
}) => {
  /**
   * Define handlers for different file formats
   */
  return {
    md: {
      // Process function for converting markdown content
      process: async (content, srcPath) => {
        // Extract the frontmatter and content
        const {
          frontmatter: frontmatterData,
          content: contentWithoutFrontmatter,
        } = extractFrontmatter(content);

        // Convert markdown to HTML
        const htmlContent = await md.renderAsync(contentWithoutFrontmatter);

        // Determine layout to use
        let layoutName; // Default to base template

        if (frontmatterData.layout) {
          // Remove file extension if present from specified layout
          layoutName = frontmatterData.layout.replace(/\.[^/.]+$/, "");
        }

        if (!layoutName) {
          throw new Error(
            `Layout not found for ${srcPath}, ${JSON.stringify(
              frontmatterData
            )}`
          );
        }

        // Generate table of contents from markdown content
        const tableOfContents = generateTableOfContents(
          contentWithoutFrontmatter
        );

        const layoutContent = templates[`${layoutName}.html`];

        if (!layoutContent) {
          throw new Error(`Layout not found for ${srcPath}`);
        }

        // Ensure URL is set if not already in frontmatter
        if (!frontmatterData.url && srcPath) {
          frontmatterData.url = generateUrlFromPath(basePath, srcPath);
        }

        // Create merged data for the layout with content, frontmatter data, and global data
        const layoutData = deepMerge(
          {},
          { ...data, collections }, // Global data
          frontmatterData, // Frontmatter data
          {
            content: htmlContent, // Rendered markdown content
            tableOfContents, // Table of contents data structure
            url: frontmatterData.url || "/", // Explicitly include the URL with default
          },
          {
            siticEnv: process.env,
          }
        );

        // Render the content within the layout
        const renderedHtml = await liquidParse(layoutContent, layoutData);

        // Minify the HTML
        const minifiedHtml = await minify(renderedHtml, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          minifyJS: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
        });

        return minifiedHtml;
      },
      // Output extension for the processed file
      outputExt: "html",
      // Always create folder with index.html for markdown files
      forceFolderWithIndex: true,
    },

    // Handler for HTML files
    html: {
      process: async (content) => {
        // Minify HTML files
        const minified = await minify(content, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          minifyJS: true,
        });
        return minified;
      },
      outputExt: "html",
      // Always create folder with index.html for HTML files
      forceFolderWithIndex: true,
    },

    // Handler for CSS files
    css: {
      process: async (content) => {
        // Create a new CleanCSS instance
        const cleanCSS = new CleanCSS();
        // Minify the CSS
        return cleanCSS.minify(content).styles;
      },
      outputExt: "css",
    },

    // Add more handlers as needed, e.g.:
    // 'scss': { process: async (content) => { /* process scss */ }, outputExt: 'css' }
  };
};

/**
 * Process a file and convert it based on its extension
 * @param {string} srcPath - Source file path
 * @param {string} destDir - Destination directory
 * @param {boolean} isIndex - Whether the file is an index file
 * @param {object} fileFormatHandlers - Handlers for different file formats
 * @returns {Promise<boolean>} - Whether the file was processed
 */
const processFile = async (
  srcPath,
  destDir,
  isIndex = false,
  fileFormatHandlers
) => {
  try {
    const content = await safeReadFile(srcPath);
    const ext = srcPath.split(".").pop()?.toLowerCase() || "";
    const handler = fileFormatHandlers[ext];

    if (!handler) {
      return false;
    }

    const processedContent = await handler.process(content, srcPath);
    const outputExt = handler.outputExt;

    // Determine the destination path
    let destPath;
    if (isIndex) {
      // If it's an index file, output to index.{outputExt} in the same directory
      destPath = join(destDir, `index.${outputExt}`);
    } else {
      // Check if this handler should use folder with index.html approach
      if (handler.forceFolderWithIndex) {
        // Create a directory with the file name
        const baseName =
          srcPath
            .split("/")
            .pop()
            ?.replace(new RegExp(`\\.${ext}$`), "") || "";
        const newDestDir = join(destDir, baseName);

        // Create directory if it doesn't exist
        await createFolderIfNotExists(newDestDir);

        destPath = join(newDestDir, `index.${outputExt}`);
      } else {
        // For other file types, just output to the destination directory with the same name
        const baseName =
          srcPath
            .split("/")
            .pop()
            ?.replace(new RegExp(`\\.${ext}$`), "") || "";
        destPath = join(destDir, `${baseName}.${outputExt}`);
      }
    }

    // Write the processed content to the new file
    await writeFile(destPath, processedContent);
    console.log(`Converted ${srcPath} to ${destPath}`);
    return true;
  } catch (error) {
    console.error(`Error processing file ${srcPath}:`, error);
    return false;
  }
};

/**
 * Copy a file to the destination, with processing if needed
 * @param {string} srcPath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {Promise<boolean>} - Whether the file was copied successfully
 */
const copyFileWithProcessing = async (
  srcPath,
  destPath,
  fileFormatHandlers
) => {
  try {
    // Get file extension
    const ext = srcPath.split(".").pop()?.toLowerCase() || "";
    const fileName = srcPath.split("/").pop() || "";

    // Handle based on file extension
    const isIndex = fileName.startsWith("index.");
    const destDir = isIndex
      ? destPath.replace(new RegExp(`/index\\.${ext}$`), "")
      : destPath.replace(/\/[^/]+$/, "");

    if (fileFormatHandlers[ext]) {
      try {
        return await processFile(srcPath, destDir, isIndex, fileFormatHandlers);
      } catch (error) {
        console.error(`Error processing file ${srcPath}:`, error);
        return false;
      }
    } else {
      // For files without handlers, copy as-is
      try {
        await copyFile(srcPath, destPath);
        console.log(`Copied ${srcPath} to ${destPath}`);
        return true;
      } catch (error) {
        console.error(`Error copying file ${srcPath}:`, error);
        return false;
      }
    }
  } catch (error) {
    console.error(`Error processing file ${srcPath}:`, error);
    return false;
  }
};

/**
 * Recursively copy a directory with processing
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
export const copyDirRecursive = async (src, dest, fileFormatHandlers) => {
  await createFolderIfNotExists(dest);

  try {
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        // Recursive call for directories
        await copyDirRecursive(srcPath, destPath, fileFormatHandlers);
      } else {
        // Process and copy the file
        await copyFileWithProcessing(srcPath, destPath, fileFormatHandlers);
      }
    }
  } catch (error) {
    console.error(`Error copying directory ${src}:`, error);
  }
};
