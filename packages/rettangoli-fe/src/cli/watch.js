import { readFileSync, watch } from "node:fs";
import path from "node:path";

import { load as loadYaml } from "js-yaml";
import { createServer } from 'vite'
import { writeViewFile } from './build.js';
import buildRettangoliFrontend from './build.js';
import { extractCategoryAndComponent } from '../common.js';


const setupWatcher = (directory) => {
  watch(
    directory,
    { recursive: true },
    async (event, filename) => {
      console.log(`Detected ${event} in ${directory}/${filename}`);
      if (filename) {
        try {
          if (filename.endsWith('.view.yaml')) {
            const view = loadYaml(readFileSync(path.join(directory, filename), "utf8"));
            const { category, component } = extractCategoryAndComponent(filename);
            await writeViewFile(view, category, component);
          }
          await buildRettangoliFrontend({ dirs: [directory] });
        } catch (error) {
          console.error(`Error processing ${filename}:`, error);
          // Keep the watcher running
        }
      }
    },
  );
};

async function startViteServer(options) {
  const { port = 3001, root = './viz/static' } = options;
  try {
    const server = await createServer({
      // any valid user config options, plus `mode` and `configFile`
      // configFile: false,
      root,
      server: {
        port,
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


const startWatching = (options) => {
  const { dirs = ['src'], port = 3001 } = options;

  dirs.forEach(dir => {
    setupWatcher(dir);
  });

  startViteServer({ port });
}

export default startWatching;
