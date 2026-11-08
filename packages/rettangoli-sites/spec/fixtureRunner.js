import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';
import { createBuildOptions } from '../src/cli/build.js';
import { parseSiteConfig } from '../src/utils/loadSiteConfig.js';

export const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const FIXTURE_FUNCTIONS = {
  'fixture-raw-html': {
    // Raw HTML functions for testing __html support
    rawHtml: (content) => ({ __html: content }),
    renderMarkdown: (text) => ({ __html: `<strong>${text}</strong>` }),
    normalString: (content) => `<em>${content}</em>`
  },
  'fixture-custom-functions': {
    uppercase: (str) => String(str).toUpperCase(),
    // Pinned to en-US and UTC so the output does not depend on the machine's locale or time zone.
    formatDate: (date, format = 'short') => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString('en-US', { timeZone: 'UTC' });
      }
      if (format === 'long') {
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
      }
      return d.toISOString();
    },
    join: (arr, separator = ', ') => Array.isArray(arr) ? arr.join(separator) : String(arr),
    lowercase: (str) => String(str).toLowerCase(),
    capitalize: (str) => {
      const s = String(str);
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    },
    truncate: (str, length = 50) => {
      const s = String(str);
      return s.length > length ? s.substring(0, length) + '...' : s;
    },
    add: (a, b) => Number(a) + Number(b),
    multiply: (a, b) => Number(a) * Number(b),
    round: (num, decimals = 0) => Number(num).toFixed(decimals),
    first: (arr) => Array.isArray(arr) ? arr[0] : arr,
    last: (arr) => Array.isArray(arr) ? arr[arr.length - 1] : arr,
    default: (value, defaultValue) => value == null || value === '' ? defaultValue : value,
    calculateTotal: (items) => {
      if (!Array.isArray(items)) return 0;
      return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    },
    formatCurrency: (amount) => '$' + Number(amount).toFixed(2)
  }
};

/**
 * Read every file under `dir` as utf8 text, recursively.
 * Returns `{ '/relative/path': text }` with the keys in sorted order.
 */
export function loadTree(fsImpl, dir) {
  const tree = {};

  function walk(current, prefix) {
    const entries = fsImpl.readdirSync(current, { withFileTypes: true })
      .map((entry) => ({ name: String(entry.name), isDirectory: entry.isDirectory() }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      const relativePath = `${prefix}/${entry.name}`;
      if (entry.isDirectory) {
        walk(entryPath, relativePath);
      } else {
        tree[relativePath] = fsImpl.readFileSync(entryPath, 'utf8');
      }
    }
  }

  walk(dir, '');
  return tree;
}

function trimValues(tree) {
  return Object.fromEntries(Object.entries(tree).map(([filePath, text]) => [filePath, text.trim()]));
}

export function listFixtures() {
  return fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Build `fixtures/<name>/in` in memory through the same config path the CLI uses
 * and return the built tree next to the expected one.
 */
export async function runFixture(name) {
  const fixtureDir = path.join(FIXTURES_DIR, name);
  const volume = Volume.fromJSON(loadTree(fs, path.join(fixtureDir, 'in')));
  const memfs = createFsFromVolume(volume);

  const configPath = ['/sites.config.yaml', '/sites.config.yml'].find((candidate) => memfs.existsSync(candidate));
  const config = configPath ? parseSiteConfig(memfs.readFileSync(configPath, 'utf8'), configPath) : {};

  const build = createSiteBuilder(createBuildOptions(config, {
    fs: memfs,
    rootDir: '/',
    quiet: true,
    functions: FIXTURE_FUNCTIONS[name]
  }));
  await build();

  const outDir = path.join(fixtureDir, 'out');
  return {
    outEntries: fs.readdirSync(outDir).sort(),
    actual: trimValues(loadTree(memfs, '/_site')),
    expected: trimValues(loadTree(fs, path.join(outDir, '_site')))
  };
}
