import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";

import esbuild from "esbuild";
import { load as loadYaml } from "js-yaml";

function capitalize(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : word;
}

/**
 * covert this format of json into raw css strings
 * notice if propoperty starts with \@, it will need to nest it
 * 
    ':host':
      display: contents
    'button':
      background-color: var(--background)
      font-size: var(--sm-font-size)
      font-weight: var(--sm-font-weight)
      line-height: var(--sm-line-height)
      letter-spacing: var(--sm-letter-spacing)
      border: 1px solid var(--ring)
      border-radius: var(--border-radius-lg)
      padding-left: var(--spacing-md)
      padding-right: var(--spacing-md)
      height: 32px
      color: var(--foreground)
      outline: none
      cursor: pointer
    'button:focus':
      border-color: var(--foreground)
    '@media (min-width: 768px)':
      'button':
        height: 40px
 * @param {*} styleObject 
 * @returns 
 */
const yamlToCss = (elementName, styleObject) => {
  if (!styleObject || typeof styleObject !== "object") {
    return "";
  }

  let css = `${elementName} {\n`;

  const convertPropertiesToCss = (properties) => {
    return Object.entries(properties)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join("\n");
  };

  const processSelector = (selector, rules) => {
    if (typeof rules !== "object" || rules === null) {
      return "";
    }

    // Check if this is an @ rule (like @media, @keyframes, etc.)
    if (selector.startsWith("@")) {
      const nestedCss = Object.entries(rules)
        .map(([nestedSelector, nestedRules]) => {
          const nestedProperties = convertPropertiesToCss(nestedRules);
          return `  ${nestedSelector} {\n${nestedProperties
            .split("\n")
            .map((line) => (line ? `  ${line}` : ""))
            .join("\n")}\n  }`;
        })
        .join("\n");

      return `${selector} {\n${nestedCss}\n}`;
    } else {
      // Regular selector
      const properties = convertPropertiesToCss(rules);
      return `${selector} {\n${properties}\n}`;
    }
  };

  // Process all top-level selectors
  Object.entries(styleObject).forEach(([selector, rules]) => {
    const selectorCss = processSelector(selector, rules);
    if (selectorCss) {
      css += (css ? "\n\n" : "") + selectorCss;
    }
  });

  css += "\n}";

  return css;
};

function extractCategoryAndComponent(filePath) {
  const parts = filePath.split("/");
  const component = parts[parts.length - 1].split(".")[0];
  const category = parts[parts.length - 3];
  const fileType = parts[parts.length - 1].split(".")[1];
  return { category, component, fileType };
}



// Function to process view files - loads YAML and creates temporary JS file
export const writeViewFile = (view, category, component) => {
  // const { category, component } = extractCategoryAndComponent(filePath);
  
  const dir = `./.temp/${category}`;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(
    `${dir}/${component}.view.js`,
    `export default ${JSON.stringify(view)};`,
  );
};

export const bundleFile = async (options) => {
  const { outfile = "./viz/static/main.js" } = options;
  await esbuild.build({
    entryPoints: ["./.temp/dynamicImport.js"],
    bundle: true,
    minify: false,
    sourcemap: true,
    outfile: outfile,
    format: "esm",
    loader: {
      ".wasm": "binary",
    },
  });
};

// Function to recursively get all files in a directory
function getAllFiles(dirPaths, arrayOfFiles = []) {
  dirPaths.forEach((dirPath) => {
    const files = readdirSync(dirPath);

    files.forEach((file) => {
      const fullPath = join(dirPath, file);
      if (statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles([fullPath], arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
  });

  return arrayOfFiles;
}

const buildRettangoliFrontend = async (options) => {
  console.log("runnig build with options", options);

  const { dirs = ["./example"], outfile = "./viz/static/main.js" } = options;

  const allFiles = getAllFiles(dirs).filter((filePath) => {
    return (
      filePath.endsWith(".store.js") ||
      filePath.endsWith(".handlers.js") ||
      filePath.endsWith(".view.yaml")
    );
  });

  let output = "";
  let cssOutput = "";

  const categories = [];
  const imports = {};

  // unique identifier needed for replacing
  let count = 10000000000;

  const replaceMap = {};

  for (const filePath of allFiles) {
    const { category, component, fileType } =
      extractCategoryAndComponent(filePath);

    if (!imports[category]) {
      imports[category] = {};
    }

    if (!imports[category][component]) {
      imports[category][component] = {};
    }

    if (!categories.includes(category)) {
      categories.push(category);
    }

    if (["handlers", "store"].includes(fileType)) {
      output += `import * as ${component}${capitalize(
        fileType,
      )} from '../${filePath}';\n`;

      replaceMap[count] = `${component}${capitalize(fileType)}`;
      imports[category][component][fileType] = count;
      count++;
    } else if (["view"].includes(fileType)) {
      const view = loadYaml(readFileSync(filePath, "utf8"));
      writeViewFile(view, category, component);
      if (view.styles) {
        cssOutput += yamlToCss(view.elementName, view.styles);
      }
      output += `import ${component}${capitalize(
        fileType,
      )} from './${category}/${component}.view.js';\n`;
      replaceMap[count] = `${component}${capitalize(fileType)}`;

      imports[category][component][fileType] = count;
      count++;
    }
  }

  output += `
import { createComponent } from 'rettangoli-fe';
import { deps, patch, h } from '../${dirs}/setup.js';
const imports = ${JSON.stringify(imports, null, 2)};

Object.keys(imports).forEach(category => {
  Object.keys(imports[category]).forEach(component => {
    const webComponent = createComponent({ ...imports[category][component], patch, h }, deps[category])
    customElements.define(imports[category][component].view.elementName, webComponent);
  })
})

`;

  Object.keys(replaceMap).forEach((key) => {
    output = output.replace(key, replaceMap[key]);
  });

  writeFileSync("./.temp/dynamicImport.js", output);

  const cssOutFile = outfile.replace(".js", ".css");
  writeFileSync(cssOutFile, cssOutput);

  await bundleFile({ outfile });

  console.log(`Build complete. Output file: ${outfile}`);
};

export default buildRettangoliFrontend;
