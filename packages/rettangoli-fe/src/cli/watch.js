import { readFileSync, watch } from "node:fs";
import path from "node:path";

import { load as loadYaml } from "js-yaml";
import { createServer } from 'vite'
import { writeViewFile } from './build.js';
import buildRettangoliFrontend from './build.js';
import { extractCategoryAndComponent } from '../commonBuild.js';

// Debounce mechanism to prevent excessive rebuilds
let rebuildTimeout = null;
const DEBOUNCE_DELAY = 200; // 200ms delay


const setupWatcher = (directory, options) => {
  watch(
    directory,
    { recursive: true },
    async (event, filename) => {
      console.log(`Detected ${event} in ${directory}/${filename}`);
      if (filename) {
        try {
          const changedFilePath = path.join(directory, filename);
          if (filename.endsWith('.view.yaml')) {
            const view = loadYaml(readFileSync(changedFilePath, "utf8"));
            const { category, component } = extractCategoryAndComponent(changedFilePath);
            await writeViewFile(view, category, component);
          }

          // Debounce the rebuild
          if (rebuildTimeout) {
            clearTimeout(rebuildTimeout);
          }

          rebuildTimeout = setTimeout(async () => {
            console.log('Triggering rebuild...');
            await buildRettangoliFrontend(options);
          }, DEBOUNCE_DELAY);

        } catch (error) {
          console.error(`Error processing ${filename}:`, error);
          // Keep the watcher running
        }
      }
    },
  );
};

async function startViteServer(options) {
  const { port = 3001, outfile = "./vt/static/main.js" } = options;

  // Extract the directory from outfile path
  const outDir = path.dirname(outfile);
  // Go up one level from the JS file directory to serve the site root
  const root = path.dirname(outDir);
  console.log('watch root dir:', root)
  try {
    const server = await createServer({
      // any valid user config options, plus `mode` and `configFile`
      // configFile: false,
      root,
      server: {
        port,
        host: '0.0.0.0',
        allowedHosts: true
      },
    });
    await server.listen();

    server.printUrls();
    server.bindCLIShortcuts({ print: true });
  } catch (error) {
    console.error("Error during Vite server startup:", error);
    process.exit(1);
  }
}


const startWatching = async (options) => {
  const { dirs = ['src'], port = 3001 } = options;

  // Set development mode for all builds in watch mode
  const watchOptions = {
    development: true,
    ...options
  };

  // Do initial build with all directories
  console.log('Starting initial build...');
  await buildRettangoliFrontend(watchOptions);
  console.log('Initial build complete');

  dirs.forEach(dir => {
    setupWatcher(dir, watchOptions);
  });

  startViteServer({ port, outfile: options.outfile });
}

export default startWatching;
