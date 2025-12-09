import { expect } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MarkdownIt from 'markdown-it';
import configFunction from '../sites.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to load fixture files recursively
function loadFixture(fixturePath) {
  const files = {};

  function readDirRecursive(dir, basePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      const itemPath = path.join(dir, item.name);
      const relativePath = path.join(basePath, item.name);

      if (item.isDirectory()) {
        readDirRecursive(itemPath, relativePath);
      } else if (item.isFile()) {
        const content = fs.readFileSync(itemPath, 'utf8');
        files['/' + relativePath] = content;
      }
    });
  }

  readDirRecursive(fixturePath);
  return files;
}

// Main test runner function
export async function runTest(fixturePath) {
  const fixtureDir = path.join(__dirname, fixturePath);

  // Create in-memory file system
  const vol = new Volume();
  const memfs = createFsFromVolume(vol);

  // Load input files
  const inputFiles = loadFixture(path.join(fixtureDir, 'in'));
  vol.fromJSON(inputFiles);

  // Get config by calling the function
  const config = configFunction({ markdownit: MarkdownIt });
  
  // Check if this is a fixture that needs custom functions
  const isCustomFunctionsFixture = fixturePath.includes('fixture-custom-functions');
  const isRawHtmlFixture = fixturePath.includes('fixture-raw-html');
  const functions = isRawHtmlFixture ? {
    // Raw HTML functions for testing __html support
    rawHtml: (content) => ({ __html: content }),
    renderMarkdown: (text) => ({ __html: `<strong>${text}</strong>` }),
    normalString: (content) => `<em>${content}</em>`
  } : isCustomFunctionsFixture ? {
    ...config.functions,
    // Additional functions needed for the test
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
    formatCurrency: (amount) => {
      return '$' + Number(amount).toFixed(2);
    }
  } : {};

  // Create and run builder with custom config
  const build = createSiteBuilder({
    fs: memfs,
    rootDir: '/',
    md: config.md,
    functions: functions
  });
  await build();

  // Get actual outputs
  const outputs = {};
  const expectedDir = path.join(fixtureDir, 'out');

  function readExpectedFiles(dir, basePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      const itemPath = path.join(dir, item.name);
      const relativePath = path.join(basePath, item.name);

      if (item.isDirectory()) {
        readExpectedFiles(itemPath, relativePath);
      } else if (item.isFile()) {
        const actualPath = '/' + relativePath;
        // Trim whitespace from actual outputs
        outputs[actualPath] = memfs.readFileSync(actualPath, 'utf8').trim();
      }
    });
  }

  readExpectedFiles(expectedDir);
  return outputs;
}

// Helper to load expected outputs
function loadExpectedOutputs(fixturePath) {
  const fixtureDir = path.join(__dirname, fixturePath);
  const expectedDir = path.join(fixtureDir, 'out');
  const outputs = {};

  function readFiles(dir, basePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      const itemPath = path.join(dir, item.name);
      const relativePath = path.join(basePath, item.name);

      if (item.isDirectory()) {
        readFiles(itemPath, relativePath);
      } else if (item.isFile()) {
        const filePath = '/' + relativePath;
        // Trim whitespace from expected outputs
        outputs[filePath] = fs.readFileSync(itemPath, 'utf8').trim();
      }
    });
  }

  readFiles(expectedDir);
  return outputs;
}

export default (fixture) => {
  const expected = loadExpectedOutputs(fixture);
  runTest(fixture).then((result) => {
    expect(result).toEqual(expected);
  });
  return true;
};

