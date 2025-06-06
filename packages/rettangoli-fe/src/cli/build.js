import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";

import esbuild from "esbuild";
import { load as loadYaml } from "js-yaml";
import { parse } from 'jempl';
import { getAllFiles, extractCategoryAndComponent } from "../common.js";

function capitalize(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : word;
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


const buildRettangoliFrontend = async (options) => {
  console.log("running build with options", options);

  const { dirs = ["./example"], outfile = "./viz/static/main.js" } = options;

  const allFiles = getAllFiles(dirs).filter((filePath) => {
    return (
      filePath.endsWith(".store.js") ||
      filePath.endsWith(".handlers.js") ||
      filePath.endsWith(".view.yaml")
    );
  });

  let output = "";

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
      view.template = parse(view.template);
      writeViewFile(view, category, component);
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

  await bundleFile({ outfile });

  console.log(`Build complete. Output file: ${outfile}`);
};

export default buildRettangoliFrontend;
