import assert from 'node:assert/strict';
import test from 'node:test';
import { items, runVisualChecks } from '../scripts/vt-ci.js';

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
