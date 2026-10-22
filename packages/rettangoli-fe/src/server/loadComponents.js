/**
 * Loads an app's components from disk for `renderComponent`, the way
 * `rtgl fe build` finds them for the browser bundle: every
 * `<category>/<component>/<component>.<type>` file under `dirs`.
 *
 * Only what the first render needs is loaded: the view, schema and constants
 * YAML, the store, and the methods (whose names the schema is checked
 * against). Handlers never run on the server, so they are never imported and
 * may use browser APIs freely. A store or methods module must import cleanly
 * in Node, unless its component is marked `ssr: false`: those are rendered as
 * bare hosts, so their modules are not imported at all.
 *
 * Node modules are imported lazily, so importing `@rettangoli/fe/server`
 * stays free of Node built-ins for runtimes that only render.
 */

const MODULE_FILE_TYPES = new Set(["store", "methods"]);
const YAML_FILE_TYPES = new Set(["view", "schema", "constants"]);

const unavailableOnServer = (name) => () => {
  throw new Error(`[loadComponents] method "${name}" is not available while prerendering.`);
};

/**
 * @param {object} options
 * @param {string} [options.cwd]   directory `dirs` are relative to
 * @param {string[]} options.dirs  component directories, as in `fe.dirs`
 * @param {string} [options.reload] a token that changes on every rebuild, so
 *   a long-running process (`rtgl sites watch`) imports edited stores and
 *   methods again. Modules those import stay cached by Node.
 * @returns {Promise<object[]>}    component configs, one per component
 */
export const loadComponents = async ({ cwd = process.cwd(), dirs, reload = "" } = {}) => {
  if (!Array.isArray(dirs) || dirs.length === 0) {
    throw new Error("[loadComponents] `dirs` must be a non-empty array of directories.");
  }

  const [{ readFileSync, existsSync }, path, { pathToFileURL }, { load: loadYaml }, { parse: parseTemplate }] =
    await Promise.all([
      import("node:fs"),
      import("node:path"),
      import("node:url"),
      import("js-yaml"),
      import("jempl"),
    ]);
  const { extractCategoryAndComponent, getAllFiles } = await import("../commonBuild.js");
  const { isSupportedComponentFile } = await import("../cli/contracts.js");

  const resolvedDirs = dirs.map((dir) => path.resolve(cwd, dir));
  for (const dir of resolvedDirs) {
    if (!existsSync(dir)) {
      throw new Error(`[loadComponents] component directory "${dir}" does not exist.`);
    }
  }

  const files = getAllFiles(resolvedDirs)
    .filter((filePath) => isSupportedComponentFile(filePath))
    .sort((a, b) => a.localeCompare(b));

  const filesByComponent = new Map();
  for (const filePath of files) {
    const { category, component, fileType } = extractCategoryAndComponent(filePath);
    const id = `${category}/${component}`;
    if (!filesByComponent.has(id)) {
      filesByComponent.set(id, {});
    }
    filesByComponent.get(id)[fileType] = filePath;
  }

  const readYamlFile = (filePath, fileType) => {
    let value;
    try {
      value = loadYaml(readFileSync(filePath, "utf8")) ?? {};
    } catch (error) {
      throw new Error(`[loadComponents] failed to parse ${filePath}: ${error.message}`);
    }
    if (fileType === "view") {
      try {
        value.template = parseTemplate(value.template);
      } catch (error) {
        throw new Error(`[loadComponents] error parsing template in ${filePath}: ${error.message}`);
      }
    }
    return value;
  };

  const configs = [];
  for (const [id, componentFiles] of filesByComponent) {
    const config = {};
    for (const fileType of YAML_FILE_TYPES) {
      if (componentFiles[fileType]) {
        config[fileType] = readYamlFile(componentFiles[fileType], fileType);
      }
    }
    if (!config.schema?.componentName) {
      throw new Error(`[loadComponents] ${id} has no schema.componentName.`);
    }
    if (!config.view) {
      throw new Error(`[loadComponents] ${id} has no .view.yaml.`);
    }

    if (config.schema.ssr === false) {
      // Never rendered here, so nothing of it needs to import.
      const methodNames = Object.keys(config.schema.methods?.properties || {});
      config.methods = Object.fromEntries(
        methodNames.map((name) => [name, unavailableOnServer(name)]),
      );
      configs.push(config);
      continue;
    }

    for (const fileType of MODULE_FILE_TYPES) {
      const filePath = componentFiles[fileType];
      if (!filePath) continue;
      try {
        const url = pathToFileURL(filePath).href;
        config[fileType] = await import(
          reload ? `${url}?rtgl-reload=${encodeURIComponent(reload)}` : url
        );
      } catch (error) {
        throw new Error(
          `[loadComponents] ${filePath} can't be imported in Node (${error.message}). ` +
            "Mark the component `ssr: false` in its schema if it can only run in a browser.",
        );
      }
    }
    configs.push(config);
  }

  return configs;
};
