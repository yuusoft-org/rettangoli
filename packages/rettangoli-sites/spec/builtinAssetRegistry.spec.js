import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBuiltinAssetRegistry } from '../src/contracts/index.js';

const packageRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(packageRoot, relativePath), 'utf8');
}

describe('built-in asset registry', () => {
  it('loads and validates the published asset registry', () => {
    const { registry } = readBuiltinAssetRegistry();

    expect(registry.schemaVersion).toBe(1);
    expect(registry.templates.length).toBeGreaterThan(0);
    expect(registry.partials.length).toBeGreaterThan(0);
    expect(registry.runtimeAssets.length).toBeGreaterThan(0);
    expect(registry.themeBundles.length).toBeGreaterThan(0);
  });

  it('keeps built-in templates free from local /public runtime helper dependencies', () => {
    const templateFiles = fs.readdirSync(path.join(packageRoot, 'sites', 'templates'))
      .filter((fileName) => fileName.endsWith('.yaml'));

    templateFiles.forEach((fileName) => {
      const content = readText(path.join('sites', 'templates', fileName));
      expect(content).not.toContain('src="/public/mobile-nav.js"');
      expect(content).not.toContain('src="/public/rtgl-icons.js"');
    });
  });

  it('keeps the seo partial free from hardcoded favicon file assumptions', () => {
    const content = readText(path.join('sites', 'partials', 'seo.yaml'));
    expect(content).not.toContain('href="/public/favicon.png"');
  });
});
