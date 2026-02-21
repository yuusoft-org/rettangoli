import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";

import esbuild from "esbuild";
import { load as loadYaml } from "js-yaml";
import { parse } from "jempl";
import { extractCategoryAndComponent } from "../commonBuild.js";
import { getAllFiles } from "../commonBuild.js";
import {
  isSupportedComponentFile,
  validateComponentEntries,
} from "./contracts.js";
import path from "node:path";

function capitalize(word) {
  return word ? word[0].toUpperCase() + word.slice(1) : word;
}

const writeYamlModuleFile = (
  yamlObject,
  category,
  component,
  fileType,
  tempDir = path.resolve(process.cwd(), ".temp"),
) => {
  const dir = path.join(tempDir, category);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(
    path.join(dir, `${component}.${fileType}.js`),
    `export default ${JSON.stringify(yamlObject)};`,
  );
};

export const writeViewFile = (
  view,
  category,
  component,
  tempDir = path.resolve(process.cwd(), ".temp"),
) => {
  writeYamlModuleFile(view, category, component, "view", tempDir);
};

export const bundleFile = async (options) => {
  const { outfile, tempDir, development = false } = options;
  await esbuild.build({
    entryPoints: [path.join(tempDir, "dynamicImport.js")],
    bundle: true,
    minify: !development,
    sourcemap: !!development,
    outfile,
    format: "esm",
    platform: "node",
    target: ["node18"],
  });
};

const buildRettangoliTui = async (options) => {
  console.log("running tui build with options", options);

  const {
    cwd = process.cwd(),
    dirs = ["./example"],
    outfile = "./dist/tui-bundle.js",
    setup = "setup.js",
    development = false,
  } = options;

  const resolvedDirs = dirs.map((dir) => path.resolve(cwd, dir));
  const resolvedSetup = path.resolve(cwd, setup);
  const resolvedOutfile = path.resolve(cwd, outfile);
  const tempDir = path.resolve(cwd, ".temp");

  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const allFiles = getAllFiles(resolvedDirs)
    .filter((filePath) => isSupportedComponentFile(filePath));

  let output = "";

  const imports = {};
  const componentContractEntries = [];

  let count = 10000000000;
  const replaceMap = {};

  for (const filePath of allFiles) {
    const { category, component, fileType } = extractCategoryAndComponent(filePath);

    if (!imports[category]) {
      imports[category] = {};
    }

    if (!imports[category][component]) {
      imports[category][component] = {};
    }

    const componentContractEntry = {
      category,
      component,
      fileType,
      filePath,
    };

    if (["handlers", "store", "methods"].includes(fileType)) {
      const relativePath = path.relative(tempDir, filePath).replaceAll(path.sep, "/");
      output += `import * as ${component}${capitalize(fileType)} from '${relativePath}';\n`;

      replaceMap[count] = `${component}${capitalize(fileType)}`;
      imports[category][component][fileType] = count;
      count += 1;
    } else if (["view", "constants", "schema"].includes(fileType)) {
      const yamlObject = loadYaml(readFileSync(filePath, "utf8")) ?? {};
      componentContractEntry.yamlObject = yamlObject;
      if (fileType === "view") {
        try {
          yamlObject.template = parse(yamlObject.template);
        } catch (error) {
          console.error(`Error parsing template in file: ${filePath}`);
          throw error;
        }
      }
      if (
        fileType === "constants"
        && (yamlObject === null || typeof yamlObject !== "object" || Array.isArray(yamlObject))
      ) {
        throw new Error(`[Build] ${filePath} must contain a YAML object at the root.`);
      }

      writeYamlModuleFile(yamlObject, category, component, fileType, tempDir);
      output += `import ${component}${capitalize(fileType)} from './${category}/${component}.${fileType}.js';\n`;
      replaceMap[count] = `${component}${capitalize(fileType)}`;

      imports[category][component][fileType] = count;
      count += 1;
    }

    componentContractEntries.push(componentContractEntry);
  }

  validateComponentEntries({
    entries: componentContractEntries,
    errorPrefix: "[Build]",
  });

  const relativeSetup = path.relative(tempDir, resolvedSetup).replaceAll(path.sep, "/");
  output += `
import { createComponent, createTuiRuntime } from '@rettangoli/tui';
import { deps } from '${relativeSetup}';
const imports = ${JSON.stringify(imports, null, 2)};

const componentRegistry = {};

Object.keys(imports).forEach((category) => {
  Object.keys(imports[category]).forEach((component) => {
    const componentConfig = imports[category][component];
    const ComponentClass = createComponent({ ...componentConfig }, deps[category] || deps.components || {});
    const elementName = componentConfig.schema?.componentName;
    if (!elementName) {
      throw new Error(\`[Build] Missing schema.componentName for \${category}/\${component}. Define it in .schema.yaml.\`);
    }
    componentRegistry[elementName] = ComponentClass;
  });
});

export const registry = componentRegistry;

export const createRuntime = (runtimeOptions = {}) => {
  return createTuiRuntime({
    componentRegistry,
    ...runtimeOptions,
  });
};
`;

  Object.keys(replaceMap).forEach((key) => {
    output = output.replace(key, replaceMap[key]);
  });

  writeFileSync(path.join(tempDir, "dynamicImport.js"), output);

  await bundleFile({ outfile: resolvedOutfile, tempDir, development });

  console.log(`TUI build complete. Output file: ${resolvedOutfile}`);
};

export default buildRettangoliTui;
