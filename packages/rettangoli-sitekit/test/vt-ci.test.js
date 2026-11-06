import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { defaultImage, items, runVisualChecks } from '../scripts/vt-ci.js';

const vtDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../vt');
// Specs with no reference yet: their mobile full-page screenshot is taller than the WebP limit
// (16383 px), so VT cannot capture them. Remove an entry here once it is captured and in `items`.
const uncoveredSpecs = [
  'templates/landing-features.html',
  'templates/landing-features-mobile-menu-open.html',
];

for (const docker of [false, true]) {
  test(`visual CI captures and compares the same scope (${docker ? 'Docker' : 'local'})`, () => {
    const calls = [];
    assert.equal(runVisualChecks({ docker, execute: (...args) => {
      calls.push(args);
      return { status: 0 };
    } }), 0);
    assert.equal(calls.length, 2);
    const selectors = items.flatMap((item) => ['--item', item]);
    assert.deepEqual(calls[0][1].slice(-selectors.length), selectors);
    assert.deepEqual(calls[1][1].slice(-selectors.length), selectors);
    assert.ok(calls[0][1].includes('screenshot'));
    assert.ok(calls[1][1].includes('report'));
    if (docker) {
      assert.equal(calls[0][0], 'docker');
      assert.ok(calls[0][1].includes('/workspace/packages/rettangoli-cli/cli.js'));
    }
  });
}

test('visual CI propagates comparison failure', () => {
  let calls = 0;
  assert.equal(runVisualChecks({ execute: () => ({ status: ++calls === 2 ? 7 : 0 }) }), 7);
  assert.equal(calls, 2);
});

test('visual CI stops when capture fails instead of comparing stale candidates', () => {
  let calls = 0;
  assert.equal(runVisualChecks({ execute: () => { calls++; return { status: 4 }; } }), 4);
  assert.equal(calls, 1);
});

test('every VT spec is covered by visual CI or listed as uncovered', () => {
  const specs = readdirSync(join(vtDirectory, 'specs'), { recursive: true })
    .filter((file) => file.endsWith('.html'))
    .map((file) => file.split('\\').join('/'))
    .sort();
  assert.deepEqual([...items, ...uncoveredSpecs].sort(), specs);
});

test('every spec that visual CI captures has reference images', () => {
  for (const item of items) {
    const directory = dirname(item);
    const name = item.slice(directory.length + 1, -'.html'.length);
    const references = readdirSync(join(vtDirectory, 'reference', directory))
      .filter((file) => file.startsWith(`${name}--`) && file.endsWith('.webp'));
    assert.ok(references.length > 0, `${item} has no reference image`);
  }
});

test('uncovered specs have no reference images yet', () => {
  for (const item of uncoveredSpecs) {
    const directory = dirname(item);
    const name = item.slice(directory.length + 1, -'.html'.length);
    const referenceDirectory = join(vtDirectory, 'reference', directory);
    const references = existsSync(referenceDirectory)
      ? readdirSync(referenceDirectory).filter((file) => file.startsWith(`${name}--`))
      : [];
    assert.deepEqual(references, [], `${item} has references; move it into items`);
  }
});

test('Docker visual CI runs the image pinned by digest unless overridden', () => {
  const imageOf = (options) => {
    const calls = [];
    runVisualChecks({ docker: true, ...options, execute: (...args) => (calls.push(args), { status: 0 }) });
    const args = calls[0][1];
    return args[args.indexOf('-w') + 2];
  };
  const previous = process.env.RTGL_VT_IMAGE;
  delete process.env.RTGL_VT_IMAGE;
  try {
    assert.equal(imageOf({}), defaultImage);
    assert.match(defaultImage, /^han4wluc\/rtgl@sha256:[0-9a-f]{64}$/);
    process.env.RTGL_VT_IMAGE = 'example/from-env@sha256:2';
    assert.equal(imageOf({}), 'example/from-env@sha256:2');
  } finally {
    if (previous === undefined) delete process.env.RTGL_VT_IMAGE;
    else process.env.RTGL_VT_IMAGE = previous;
  }
  assert.equal(imageOf({ image: 'example/custom@sha256:1' }), 'example/custom@sha256:1');
});
