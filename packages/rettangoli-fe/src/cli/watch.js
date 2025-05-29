import { watch } from "node:fs";
import path from "node:path";

import { createServer } from 'vite'
import { processViewFile, bundleFile } from './build.js';

const setupWatcher = (directory) => {
  watch(
    directory,
    { recursive: true },
    async (event, filename) => {
      console.log(`Detected ${event} in ${directory}/${filename}`);
      if (filename) {
        try {
          if (filename.endsWith('.view.yaml')) {
            await processViewFile(path.join(directory, filename));
          }
          await bundleFile({});
        } catch (error) {
          console.error(`Error processing ${filename}:`, error);
          // Keep the watcher running
        }
      }
    },
  );
};

async function startViteServer(options) {
  const { port = 3001 } = options;
  try {
    const server = await createServer({
      // any valid user config options, plus `mode` and `configFile`
      // configFile: false,
      // root: __dirname,
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
