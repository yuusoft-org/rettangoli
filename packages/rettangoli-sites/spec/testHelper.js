import { expect } from 'vitest';
import { createFsFromVolume, Volume } from 'memfs';
import { createSiteBuilder } from '../src/createSiteBuilder.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../sites.config.js';

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
export function runTest(fixturePath) {
  const fixtureDir = path.join(__dirname, fixturePath);

  // Create in-memory file system
  const vol = new Volume();
  const memfs = createFsFromVolume(vol);

  // Load input files
  const inputFiles = loadFixture(path.join(fixtureDir, 'in'));
  vol.fromJSON(inputFiles);

  // Create and run builder with custom mdRender from config
  const build = createSiteBuilder({ fs: memfs, rootDir: '/', mdRender: config.mdRender });
  build();

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
  const result = runTest(fixture)
  const expected = loadExpectedOutputs(fixture);
  expect(result).toEqual(expected);
  return true;
};

