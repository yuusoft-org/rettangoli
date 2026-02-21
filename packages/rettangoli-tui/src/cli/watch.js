import { readFileSync, watch } from "node:fs";
import path from "node:path";

import { load as loadYaml } from "js-yaml";
import { writeViewFile } from "./build.js";
import buildRettangoliTui from "./build.js";
import { extractCategoryAndComponent } from "../commonBuild.js";

let rebuildTimeout = null;
const DEBOUNCE_DELAY = 200;

const setupWatcher = (directory, options) => {
  watch(
    directory,
    { recursive: true },
    async (event, filename) => {
      console.log(`Detected ${event} in ${directory}/${filename}`);
      if (!filename) {
        return;
      }

      try {
        const changedFilePath = path.join(directory, filename);
        if (filename.endsWith(".view.yaml")) {
          const view = loadYaml(readFileSync(changedFilePath, "utf8"));
          const { category, component } = extractCategoryAndComponent(changedFilePath);
          await writeViewFile(view, category, component);
        }

        if (rebuildTimeout) {
          clearTimeout(rebuildTimeout);
        }

        rebuildTimeout = setTimeout(async () => {
          console.log("Triggering TUI rebuild...");
          await buildRettangoliTui(options);
        }, DEBOUNCE_DELAY);
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
      }
    },
  );
};

const startWatching = async (options) => {
  const { dirs = ["src"] } = options;

  const watchOptions = {
    development: true,
    ...options,
  };

  console.log("Starting initial TUI build...");
  await buildRettangoliTui(watchOptions);
  console.log("Initial build complete");

  dirs.forEach((dir) => {
    setupWatcher(dir, watchOptions);
  });

  console.log("Watching for TUI component changes...");
};

export default startWatching;
