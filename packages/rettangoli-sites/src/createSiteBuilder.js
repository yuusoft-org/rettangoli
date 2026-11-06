import path from 'path';

import MarkdownIt from 'markdown-it';
import rtglMarkdown from './rtglMarkdown.js';
import { buildSitemapXml } from './sitemap.js';
import { loadComponentRegistry, loadComponentRendererFromProject } from './componentRenderer.js';
import { assertSafeOutputPath } from './utils/pathSafety.js';
import { deepMerge, isPlainObject } from './utils/object.js';
import { loadImportedAliases, loadImportedData, writeImportIndex } from './imports.js';
import { readDataDir, readYamlTree } from './sources.js';
import { assertUniqueMarkdownOutputPaths, assertUniquePageUrls, buildCollections, collectPageEntries } from './pages.js';
import { renderPage } from './render.js';
import { writeOutput } from './output.js';

// The build runs in stages, in this order: sources (imports, partials, data, templates),
// components, pages, collections, render, sitemap, then output. Nothing is written to the
// output folder until every page and the sitemap have rendered.

export function createSiteBuilder({
  fs,
  rootDir = '.',
  outputPath = '_site',
  md,
  markdown = {},
  keepMarkdownFiles = false,
  imports = {},
  data = {},
  sitemap,
  fetchImpl,
  functions = {},
  components,
  loadComponentRenderer = loadComponentRendererFromProject,
  quiet = false,
  isScreenshotMode = false
}) {
  return async function build() {
    if (components != null && (!isPlainObject(components) || !Array.isArray(components.dirs) || components.dirs.length === 0)) {
      throw new Error('Invalid components config: expected an object with a non-empty "dirs" array.');
    }

    // Use provided md or default to rtglMarkdown
    const mdInstance = md || rtglMarkdown(MarkdownIt, markdown);
    const absoluteRootDir = path.resolve(rootDir);
    const outputRootDir = path.resolve(rootDir, outputPath);
    assertSafeOutputPath(fs, absoluteRootDir, outputRootDir, outputPath);

    const { resolved: importedTemplates, entries: templateEntries } = await loadImportedAliases({
      fs,
      rootDir,
      importMap: imports.templates,
      importGroup: 'templates',
      typeLabel: 'template',
      fetchImpl
    });
    const { resolved: importedPartials, entries: partialEntries } = await loadImportedAliases({
      fs,
      rootDir,
      importMap: imports.partials,
      importGroup: 'partials',
      typeLabel: 'partial',
      fetchImpl
    });

    const importEntries = [...templateEntries, ...partialEntries];
    if (importEntries.length > 0) {
      writeImportIndex(fs, rootDir, importEntries);
    }

    const partials = readYamlTree(fs, path.join(rootDir, 'partials'), 'partial file', { ...importedPartials });

    if (!isPlainObject(data)) {
      throw new Error('Invalid site data: expected an object.');
    }

    const importedData = await loadImportedData(imports.data, fetchImpl);

    // Local files replace imported data with the same alias.
    const fileData = readDataDir(fs, path.join(rootDir, 'data'), { ...importedData });
    const globalData = deepMerge(data, fileData);

    const templates = readYamlTree(fs, path.join(rootDir, 'templates'), 'template file', { ...importedTemplates });

    // Load prerendered components once per build, before any page renders.
    const componentRegistry = components == null
      ? null
      : await loadComponentRegistry({ components, rootDir: absoluteRootDir, loadComponentRenderer });

    const pageEntries = collectPageEntries({
      fs,
      pagesDir: path.join(rootDir, 'pages'),
      globalData,
      componentRegistry,
      functions
    });
    assertUniquePageUrls(pageEntries);
    if (keepMarkdownFiles) {
      assertUniqueMarkdownOutputPaths(pageEntries);
    }

    // Build collections in first pass
    if (!quiet) console.log('Building collections...');
    const collections = buildCollections(pageEntries);

    // Render every page and the sitemap before the output folder is touched,
    // so a failed build leaves the previous output as it was.
    const renderContext = {
      md: mdInstance,
      globalData,
      partials,
      templates,
      collections,
      componentRegistry,
      functions,
      isScreenshotMode,
      keepMarkdownFiles,
      outputRootDir
    };
    const renderedPages = [];
    for (const pageEntry of pageEntries) {
      renderedPages.push(await renderPage(renderContext, pageEntry));
    }
    const sitemapXml = buildSitemapXml({ pageEntries, sitemap, globalData });

    writeOutput({ fs, rootDir, absoluteRootDir, outputRootDir, outputPath, sitemap, quiet }, renderedPages, sitemapXml);

    if (!quiet) console.log('Build complete!');
  };
}
