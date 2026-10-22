import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';

const FE_SERVER_SPECIFIER = '@rettangoli/fe/server';
const FE_REQUIREMENT = '@rettangoli/fe 1.6.0 or later (whose "@rettangoli/fe/server" entry exports loadComponents)';

/**
 * Load `@rettangoli/fe/server` from the site's own project, so components are
 * rendered by the same @rettangoli/fe version the site's browser bundle uses.
 * @param {Object} options
 * @param {string} options.rootDir - Absolute site root directory
 * @returns {Promise<Object>} The `@rettangoli/fe/server` module
 */
export async function loadComponentRendererFromProject({ rootDir }) {
  const requireFromProject = createRequire(path.join(rootDir, 'package.json'));

  let resolvedPath;
  try {
    resolvedPath = requireFromProject.resolve(FE_SERVER_SPECIFIER);
  } catch (error) {
    throw new Error(
      `"components" in sites.config.yaml needs ${FE_REQUIREMENT} installed in the site project at "${rootDir}". Could not resolve "${FE_SERVER_SPECIFIER}": ${error.message}`
    );
  }

  return import(pathToFileURL(resolvedPath).href);
}

/**
 * Load the component renderer and the component registry for one build.
 * @param {Object} options
 * @param {Object} options.components - Normalized `components` config (`{ dirs }`)
 * @param {string} options.rootDir - Absolute site root directory
 * @param {Function} options.loadComponentRenderer - Resolves the `@rettangoli/fe/server` module
 * @returns {Promise<{ renderer: Object, registry: unknown }>}
 */
let buildCount = 0;

export async function loadComponentRegistry({ components, rootDir, loadComponentRenderer }) {
  const renderer = await loadComponentRenderer({ rootDir });

  if (!renderer || typeof renderer.loadComponents !== 'function' || typeof renderer.renderComponent !== 'function') {
    throw new Error(
      `"components" in sites.config.yaml needs ${FE_REQUIREMENT}. The loaded "${FE_SERVER_SPECIFIER}" does not export both loadComponents and renderComponent; upgrade @rettangoli/fe in the site project.`
    );
  }

  let registry;
  try {
    // A new token per build, so a watch rebuild imports edited stores again.
    registry = await renderer.loadComponents({
      cwd: rootDir,
      dirs: [...components.dirs],
      reload: String(++buildCount),
    });
  } catch (error) {
    throw new Error(`Failed to load components from ${components.dirs.join(', ')}: ${error.message}`, { cause: error });
  }

  return { renderer, registry };
}

/**
 * Create the `renderComponent(tag, props)` template function for one page.
 * @param {Object} options
 * @param {{ renderer: Object, registry: unknown }|null} options.componentRegistry - Loaded registry, or null when `components` is not configured
 * @param {string} options.pageLabel - Page path used in error messages
 * @returns {Function}
 */
export function createRenderComponentFunction({ componentRegistry, pageLabel }) {
  return function renderComponent(tag, props) {
    if (!componentRegistry) {
      throw new Error(
        `renderComponent("${tag}") in ${pageLabel} needs components: add components.dirs to sites.config.yaml.`
      );
    }

    let result;
    try {
      result = componentRegistry.renderer.renderComponent({
        component: tag,
        components: componentRegistry.registry,
        props: props ?? {},
        serializeProps: true
      });
    } catch (error) {
      throw new Error(`renderComponent("${tag}") failed in ${pageLabel}: ${error.message}`, { cause: error });
    }

    if (!result || typeof result.html !== 'string') {
      throw new Error(`renderComponent("${tag}") failed in ${pageLabel}: expected @rettangoli/fe to return { html }.`);
    }

    return { __html: result.html };
  };
}
