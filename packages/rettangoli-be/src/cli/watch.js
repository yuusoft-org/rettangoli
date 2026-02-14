import path from 'node:path';
import { existsSync, statSync, watch } from 'node:fs';
import build from './build.js';

const DEBOUNCE_DELAY = 250;

const startWatch = (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    setup = './src/setup.js',
  } = options;

  const setupPath = path.resolve(cwd, setup);
  const watchTargets = new Map();

  dirs.forEach((dir) => {
    const target = path.resolve(cwd, dir);
    watchTargets.set(target, { recursive: true });
  });

  watchTargets.set(path.resolve(cwd, middlewareDir), { recursive: true });
  watchTargets.set(path.dirname(setupPath), { recursive: false });

  let timeout;

  const scheduleBuild = () => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      try {
        build(options);
      } catch (error) {
        console.error(error.message);
      }
    }, DEBOUNCE_DELAY);
  };

  build(options);

  watchTargets.forEach((watchOptions, target) => {
    if (!existsSync(target)) {
      return;
    }

    const stats = statSync(target);
    const recursive = stats.isDirectory() ? watchOptions.recursive : false;
    const onChange = () => {
      scheduleBuild();
    };

    try {
      watch(target, { recursive }, onChange);
    } catch {
      watch(target, { recursive: false }, onChange);
    }
  });

  console.log('[Watch] Watching backend files for changes...');
};

export default startWatch;
