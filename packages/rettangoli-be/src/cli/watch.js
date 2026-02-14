import path from 'node:path';
import chokidar from 'chokidar';
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
  const watchTargets = [
    ...dirs.map((dir) => path.resolve(cwd, dir)),
    path.resolve(cwd, middlewareDir),
    setupPath,
  ];

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

  const watcher = chokidar.watch(watchTargets, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 25,
    },
  });

  watcher.on('all', () => {
    scheduleBuild();
  });

  console.log('[Watch] Watching backend files for changes...');
  return watcher;
};

export default startWatch;
