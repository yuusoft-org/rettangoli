import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DateTime } from "luxon";

// Create the equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {
  safeYamlLoad,
  safeReadFile,
  deepMerge,
  createTemplateRenderer,
  createFolderIfNotExists,
  configureMarkdown,
  loadCollections,
  createFileFormatHandlers,
  loadItems,
  copyDirRecursive,
} from "../common.js";
import { rm } from "fs/promises";

/**
 * Copy pages to site with processing
 * @param {Object} options - Options for copying pages
 * @param {string} options.resourcesPath - Path to resources directory
 * @param {string} options.pagesPath - Path to pages directory
 * @param {string} options.outputPath - Path to output directory
 */
export const copyPagesToSite = async (options) => {
  const {
    resourcesPath = "./sitic",
    pagesPath = "./pages",
    outputPath = "./_site",
  } = options;

  const dataPath = join(resourcesPath, "data.yaml");
  const templatesPath = join(resourcesPath, "templates");
  const componentsPath = join(resourcesPath, "components");
  const recordsPath = join(resourcesPath, "records");

  // Load hello.yaml template data
  const inputYaml = await safeReadFile(dataPath);

  const templates = await loadItems({
    path: join(__dirname, "./templates"),
    name: "templates",
    isYaml: false,
    keepExtension: true,
  });

  if (templatesPath) {
    const customTemplates = await loadItems({
      path: templatesPath,
      name: "templates",
      isYaml: false,
      keepExtension: true,
    });
    Object.assign(templates, customTemplates);
  }

  // Load data
  const records = await loadItems({
    path: recordsPath,
    name: "records",
    isYaml: true,
  });

  const components = await loadItems({
    path: join(__dirname, "./components"),
    name: "components",
    isYaml: false,
  });

  if (componentsPath) {
    const customComponents = await loadItems({
      path: componentsPath,
      name: "components",
      isYaml: false,
    });
    Object.assign(components, customComponents);
  }

  const collections = await loadCollections(pagesPath);

  const liquidParse = createTemplateRenderer({
    templates,
    filters: {
      json: (obj) => JSON.stringify(obj),
      "json-escaped": (obj) => {
        if (!obj) {
          return "";
        }
        return encodeURIComponent(JSON.stringify(obj));
      },
      postDate: (dateObj) => {
        if (!dateObj || typeof dateObj !== 'string') {
          return ''; // Return empty string or some default value if dateObj is undefined or not a string
        }
        try {
          return DateTime.fromFormat(dateObj, "yyyy-MM-dd").toLocaleString(
            DateTime.DATE_MED
          );
        } catch (error) {
          console.error(`Error formatting date "${dateObj}":`, error.message);
          return dateObj; // Return the original date string if parsing fails
        }
      },
    },
  });

  let data;
  try {
    data = safeYamlLoad(liquidParse(inputYaml, { collections }));
  } catch (error) {
    console.error("Error creating template renderer:", error);
    throw error;
  }

  // Create global data object for templates
  const globalData = {
    data,
    collections,
    records,
  };

  const yamlComponentRenderer = (content) => {
    const renderedContent = liquidParse(content, globalData);
    const yamlContent = safeYamlLoad(renderedContent);

    return yamlContent
      .map(({ component, data }) => {
        const foundComponent = components[component];
        if (!foundComponent) {
          throw new Error(`Component not found for ${component}`);
        }
        return liquidParse(foundComponent, deepMerge(globalData, data));
      })
      .join("\n");
  };

  const md = configureMarkdown({
    yamlComponentRenderer,
  });

  const fileFormatHandlers = createFileFormatHandlers({
    basePath: pagesPath,
    templates,
    liquidParse,
    data: globalData.data,
    collections,
    md,
  });

  try {
    await rm(outputPath, { recursive: true, force: true });
    await createFolderIfNotExists(outputPath);
    await copyDirRecursive(pagesPath, outputPath, fileFormatHandlers);
    console.log(`Pages copied from ${pagesPath} to ${outputPath} successfully`);
  } catch (error) {
    console.error(
      `Error copying pages from ${pagesPath} to ${outputPath}:`,
      error
    );
  }
};
