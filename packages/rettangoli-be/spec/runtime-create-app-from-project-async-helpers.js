import path from 'node:path';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createAppFromProject } from '../src/runtime/createAppFromProject.js';

const writeHealthPingContractFiles = ({
  methodDir,
  handlerSource,
  setupDefaultExport = false,
}) => {
  writeFileSync(path.join(methodDir, 'ping.handlers.js'), handlerSource);
  writeFileSync(path.join(methodDir, 'ping.rpc.yaml'), [
    'method: health.ping',
    'description: Health ping',
    'middleware:',
    setupDefaultExport ? '  before: []' : '  before: [withRequestId]',
    '  after: []',
    'paramsSchema:',
    '  type: object',
    '  additionalProperties: false',
    setupDefaultExport ? '  properties: {}' : '  properties:',
    setupDefaultExport ? '  required: []' : '    echo:',
    setupDefaultExport ? '' : '      type: string',
    'outputSchema:',
    '  success:',
    '    type: object',
    '    additionalProperties: false',
    '    properties:',
    '      ok:',
    '        type: boolean',
    setupDefaultExport ? '' : '      echo:',
    setupDefaultExport ? '' : '        type: string',
    setupDefaultExport ? '' : '      requestId:',
    setupDefaultExport ? '' : '        type: string',
    setupDefaultExport ? '' : '      ts:',
    setupDefaultExport ? '' : '        type: number',
    setupDefaultExport ? '    required: [ok]' : '    required: [ok, requestId, ts]',
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
  ].filter((line) => line !== '').join('\n'));
  writeFileSync(path.join(methodDir, 'ping.spec.yaml'), [
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
};

export const createAppFromProjectDiscoversFiles = async () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-'));

  try {
    const setupDir = path.join(rootDir, 'src');
    mkdirSync(setupDir, { recursive: true });

    writeFileSync(path.join(setupDir, 'setup.js'), [
      'export const setup = {',
      '  port: 3030,',
      '  deps: {',
      '    health: {',
      '      now: () => 1700000000000,',
      '    },',
      '  },',
      '};',
      '',
    ].join('\n'));

    const middlewareDir = path.join(rootDir, 'src', 'middleware');
    mkdirSync(middlewareDir, { recursive: true });
    writeFileSync(path.join(middlewareDir, 'withRequestId.js'), [
      'export const withRequestId = ({ createId }) => {',
      '  return (next) => async (ctx) => {',
      '    ctx.requestId = ctx.requestId || createId();',
      '    return next(ctx);',
      '  };',
      '};',
      '',
    ].join('\n'));

    const methodDir = path.join(rootDir, 'src', 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });
    writeHealthPingContractFiles({
      methodDir,
      handlerSource: [
        'export const healthPingMethod = async ({ payload, context, deps }) => {',
        '  return {',
        '    ok: true,',
        '    echo: payload.echo,',
        '    requestId: context.requestId,',
        '    ts: deps.now(),',
        '  };',
        '};',
        '',
      ].join('\n'),
    });

    const app = await createAppFromProject({
      cwd: rootDir,
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
      setupPath: './src/setup.js',
      createRequestId: () => 'req-auto',
    });

    return app.dispatch({
      request: {
        jsonrpc: '2.0',
        id: '1',
        method: 'health.ping',
        params: {
          echo: 'ok',
        },
      },
    });
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
};

export const createAppFromProjectSupportsDefaultSetup = async () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'rtgl-be-app-default-'));

  try {
    const srcDir = path.join(rootDir, 'src');
    mkdirSync(srcDir, { recursive: true });

    writeFileSync(path.join(srcDir, 'setup.js'), [
      'const setup = {',
      '  port: 3031,',
      '  deps: { health: {} },',
      '};',
      'export default setup;',
      '',
    ].join('\n'));

    const methodDir = path.join(srcDir, 'modules', 'health', 'ping');
    mkdirSync(methodDir, { recursive: true });
    writeHealthPingContractFiles({
      methodDir,
      setupDefaultExport: true,
      handlerSource: 'export const healthPingMethod = async () => ({ ok: true });\n',
    });

    const app = await createAppFromProject({
      cwd: rootDir,
      methodDirs: ['./src/modules'],
      middlewareDirs: ['./src/middleware'],
      setupPath: './src/setup.js',
    });

    const response = await app.dispatch({
      request: {
        jsonrpc: '2.0',
        id: '1',
        method: 'health.ping',
        params: {},
      },
    });

    return {
      ok: response.result.ok,
    };
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
};
