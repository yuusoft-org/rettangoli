import { buildSite } from './build.js';
import watchSite from './watch.js';
import { initSite } from './init.js';

// Deprecated stub kept for the "./cli" export; rtgl does not call it. Remove in the next major.
const screenshotCommand = async () => {
  throw new Error(
    'Screenshot CLI for @rettangoli/sites was removed. Use "rtgl vt generate" with "vt.url" and optional "vt.service.start".',
  );
};

export {
  buildSite,
  watchSite,
  screenshotCommand,
  initSite,
}
