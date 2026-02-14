import path from 'node:path';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import build from '../../src/cli/build.js';

describe('be build cli', () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it('generates registry and app entry without user index files', () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-build-'));
    createdDirs.push(rootDir);

    const srcDir = path.join(rootDir, 'src');
    mkdirSync(path.join(srcDir, 'modules', 'health', 'ping'), { recursive: true });

    writeFileSync(path.join(srcDir, 'setup.js'), [
      'const setup = {',
      '  port: 3030,',
      '  deps: { health: {} },',
      '};',
      'export default setup;',
      '',
    ].join('\n'));

    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.handlers.js'), 'export const healthPingMethod = async () => ({ ok: true });\n');
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.rpc.yaml'), [
      'method: health.ping',
      'description: ping',
      'middleware:',
      '  before: []',
      '  after: []',
      'paramsSchema:',
      '  type: object',
      '  additionalProperties: false',
      '  properties: {}',
      '  required: []',
      'outputSchema:',
      '  success:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      ok:',
      '        type: boolean',
      '    required: [ok]',
      '  error:',
      '    type: object',
      '    additionalProperties: false',
      '    properties:',
      '      _error:',
      '        const: true',
      '      type:',
      '        type: string',
      '    required: [_error, type]',
      '',
    ].join('\n'));
    writeFileSync(path.join(srcDir, 'modules', 'health', 'ping', 'ping.spec.yaml'), [
      "file: './ping.handlers.js'",
      'group: health-ping',
      '---',
      'suite: healthPingMethod',
      'exportName: healthPingMethod',
      '---',
      'case: ok',
      'in:',
      '  - payload: {}',
      'out:',
      '  ok: true',
      '',
    ].join('\n'));

    const out = build({
      cwd: rootDir,
      dirs: ['./src/modules'],
      middlewareDir: './src/middleware',
      setup: './src/setup.js',
      outdir: './.rtgl-be/generated',
    });

    expect(out.methodCount).toBe(1);
    expect(existsSync(out.registryPath)).toBe(true);
    expect(existsSync(out.appEntryPath)).toBe(true);

    const appEntry = readFileSync(out.appEntryPath, 'utf8');
    expect(appEntry).toContain('setupModule.setup ?? setupModule.default');
  });
});
