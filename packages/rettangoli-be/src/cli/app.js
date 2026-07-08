import path from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { analyzeBackendContracts } from './contractScope.js';
import {
  createBackendCommands,
  createNextAction,
  createScope,
  findCommand,
  normalizeDiagnostic,
  normalizeDiagnostics,
  toPosixRelativePath,
} from './agentLoop.js';
import { createApp } from '../runtime/createApp.js';
import { resolveSingleFunctionExport } from '../runtime/resolveExports.js';
import { createCliResult } from './results.js';
import { stringifyStableJson } from './json.js';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const importModuleFromPath = async (filePath) => {
  const url = pathToFileURL(filePath);
  url.searchParams.set('rtgl', `${Date.now()}-${Math.random()}`);
  return import(url.href);
};

const createAppDiagnostic = ({ cwd, error, method, command }) => normalizeDiagnostic({
  cwd,
  error,
  phase: 'app',
  method,
  command,
});

const resolveSetupExport = (setupModule) => {
  if (Object.prototype.hasOwnProperty.call(setupModule, 'setup')) {
    return setupModule.setup;
  }

  if (Object.prototype.hasOwnProperty.call(setupModule, 'default')) {
    return setupModule.default;
  }

  return undefined;
};

const collectReferencedMiddlewareNames = (contracts = []) => {
  return new Set(contracts.flatMap((contract) => [
    ...(Array.isArray(contract.rpc?.middleware?.before) ? contract.rpc.middleware.before : []),
    ...(Array.isArray(contract.rpc?.middleware?.after) ? contract.rpc.middleware.after : []),
  ]));
};

const collectGlobalMiddlewareNames = ({ globalMiddlewareBefore = [], globalMiddlewareAfter = [] } = {}) => {
  return new Set([
    ...(Array.isArray(globalMiddlewareBefore) ? globalMiddlewareBefore : []),
    ...(Array.isArray(globalMiddlewareAfter) ? globalMiddlewareAfter : []),
  ]);
};

const validateHandlerExport = ({ cwd, contract, moduleObject, diagnostics, command }) => {
  try {
    resolveSingleFunctionExport({
      moduleObject,
      label: `handler '${contract.method}'`,
    });
  } catch (error) {
    diagnostics.push(createAppDiagnostic({
      cwd,
      method: contract.method,
      command,
      error: {
        code: 'RTGL-BE-APP-010',
        method: contract.method,
        message: `Invalid handler export for '${contract.method}': ${error.message}`,
        filePath: contract.handlerPath,
      },
    }));
  }
};

const validateMiddlewareExport = ({ cwd, middlewareEntry, moduleObject, diagnostics, command, method }) => {
  try {
    resolveSingleFunctionExport({
      moduleObject,
      preferredName: middlewareEntry.middlewareName,
      label: `middleware '${middlewareEntry.middlewareName}'`,
    });
  } catch (error) {
    diagnostics.push(createAppDiagnostic({
      cwd,
      method,
      command,
      error: {
        code: 'RTGL-BE-APP-011',
        message: `Invalid middleware export for '${middlewareEntry.middlewareName}': ${error.message}`,
        filePath: middlewareEntry.filePath,
      },
    }));
  }
};

const createInstantiationDiagnostic = ({ cwd, error, method, command, setupPath, middlewareEntries }) => {
  const middlewareFactoryMatch = error.message.match(/middleware factory '([^']+)' (?:must return|failed)/);
  const middlewareName = middlewareFactoryMatch?.[1];
  const middlewareEntry = middlewareName
    ? middlewareEntries.find((entry) => entry.middlewareName === middlewareName)
    : undefined;

  if (middlewareEntry) {
    return createAppDiagnostic({
      cwd,
      method,
      command,
      error: {
        code: 'RTGL-BE-APP-011',
        message: `Invalid middleware export for '${middlewareName}': ${error.message}`,
        filePath: middlewareEntry.filePath,
      },
    });
  }

  return createAppDiagnostic({
    cwd,
    method,
    command,
    error: {
      code: 'RTGL-BE-APP-009',
      message: `Failed to instantiate backend app: ${error.message}`,
      filePath: setupPath,
    },
  });
};

export const runBackendAppCheck = async (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ['./src/modules'],
    middlewareDir = './src/middleware',
    setup = './src/setup.js',
    method,
    globalMiddlewareBefore = [],
    globalMiddlewareAfter = [],
  } = options;
  const commands = createBackendCommands({
    dirs,
    method,
    middlewareDir,
    setup,
  });
  const command = findCommand(commands, 'app');
  const globalMiddlewareNames = collectGlobalMiddlewareNames({
    globalMiddlewareBefore,
    globalMiddlewareAfter,
  });
  const analysis = analyzeBackendContracts({
    cwd,
    dirs,
    middlewareDir,
    method,
    extraMiddlewareNames: [...globalMiddlewareNames],
  });
  const methods = method
    ? analysis.contracts.map((contract) => contract.method)
    : analysis.allContracts.map((contract) => contract.method);
  const scope = createScope({ method, methods });

  if (!analysis.ok) {
    const diagnostics = normalizeDiagnostics({
      cwd,
      errors: analysis.errors,
      phase: 'contracts',
      method,
      command: findCommand(commands, 'check'),
    });

    return createCliResult({
      command: 'app check',
      artifactSchemaVersion: 'rettangoli.appCheck/v1',
      ok: false,
      phase: 'contracts',
      scope,
      method,
      commands,
      diagnostics,
      nextAction: createNextAction({
        ok: false,
        failedPhase: 'contracts',
        diagnostics,
        commands,
      }),
    });
  }

  const setupPath = path.resolve(cwd, setup);
  const diagnostics = [];
  let setupValue;

  if (!existsSync(setupPath)) {
    diagnostics.push(createAppDiagnostic({
      cwd,
      method,
      command,
      error: {
        code: 'RTGL-BE-APP-001',
        message: `Setup file not found: ${setup}`,
        filePath: setupPath,
      },
    }));
  } else {
    try {
      const setupModule = await importModuleFromPath(setupPath);
      setupValue = resolveSetupExport(setupModule);
    } catch (error) {
      diagnostics.push(createAppDiagnostic({
        cwd,
        method,
        command,
        error: {
          code: 'RTGL-BE-APP-002',
          message: `Failed to import setup file: ${error.message}`,
          filePath: setupPath,
        },
      }));
    }
  }

  if (setupValue === undefined && diagnostics.length === 0) {
    diagnostics.push(createAppDiagnostic({
      cwd,
      method,
      command,
      error: {
        code: 'RTGL-BE-APP-003',
        message: 'Setup file must export setup or default.',
        filePath: setupPath,
      },
    }));
  } else if (setupValue !== undefined && !isPlainObject(setupValue)) {
    diagnostics.push(createAppDiagnostic({
      cwd,
      method,
      command,
      error: {
        code: 'RTGL-BE-APP-004',
        message: 'Setup export must be an object.',
        filePath: setupPath,
      },
    }));
  } else if (isPlainObject(setupValue) && !isPlainObject(setupValue.deps)) {
    diagnostics.push(createAppDiagnostic({
      cwd,
      method,
      command,
      error: {
        code: 'RTGL-BE-APP-005',
        message: 'Setup export must include setup.deps object.',
        filePath: setupPath,
      },
    }));
  }

  if (isPlainObject(setupValue?.deps)) {
    analysis.contracts.forEach((contract) => {
      if (!isPlainObject(setupValue.deps[contract.domain])) {
        diagnostics.push(createAppDiagnostic({
          cwd,
          method: contract.method,
          command,
          error: {
            code: 'RTGL-BE-APP-006',
            method: contract.method,
            message: `Missing setup.deps.${contract.domain} object required by method '${contract.method}'.`,
            filePath: setupPath,
          },
        }));
      }
    });
  }

  const methodContracts = {};
  const methodHandlers = {};
  const middlewareModules = {};
  const referencedMiddlewareNames = collectReferencedMiddlewareNames(analysis.contracts);
  const referencedMiddlewareEntries = analysis.middlewareEntries
    .filter((entry) => referencedMiddlewareNames.has(entry.middlewareName));
  const scopedMiddlewareNames = new Set([
    ...referencedMiddlewareNames,
    ...globalMiddlewareNames,
  ]);
  const middlewareEntriesToValidate = method
    ? analysis.middlewareEntries.filter((entry) => scopedMiddlewareNames.has(entry.middlewareName))
    : analysis.middlewareEntries;

  for (const contract of analysis.contracts) {
    methodContracts[contract.method] = contract.rpc;
    try {
      methodHandlers[contract.method] = await importModuleFromPath(contract.handlerPath);
      validateHandlerExport({
        cwd,
        contract,
        moduleObject: methodHandlers[contract.method],
        diagnostics,
        command,
      });
    } catch (error) {
      diagnostics.push(createAppDiagnostic({
        cwd,
        method: contract.method,
        command,
        error: {
          code: 'RTGL-BE-APP-007',
          method: contract.method,
          message: `Failed to import handler for '${contract.method}': ${error.message}`,
          filePath: contract.handlerPath,
        },
      }));
    }
  }

  for (const middlewareEntry of middlewareEntriesToValidate) {
    try {
      middlewareModules[middlewareEntry.middlewareName] = await importModuleFromPath(middlewareEntry.filePath);
      validateMiddlewareExport({
        cwd,
        middlewareEntry,
        moduleObject: middlewareModules[middlewareEntry.middlewareName],
        diagnostics,
        command,
        method,
      });
    } catch (error) {
      diagnostics.push(createAppDiagnostic({
        cwd,
        method,
        command,
        error: {
          code: 'RTGL-BE-APP-008',
          message: `Failed to import middleware '${middlewareEntry.middlewareName}': ${error.message}`,
          filePath: middlewareEntry.filePath,
        },
      }));
    }
  }

  if (diagnostics.length === 0) {
    try {
      createApp({
        setup: setupValue,
        methodContracts,
        methodHandlers,
        middlewareModules,
        globalMiddlewareBefore,
        globalMiddlewareAfter,
      });
    } catch (error) {
      diagnostics.push(createInstantiationDiagnostic({
        cwd,
        error,
        method,
        command,
        setupPath,
        middlewareEntries: middlewareEntriesToValidate,
      }));
    }
  }

  const ok = diagnostics.length === 0;
  const files = [
    toPosixRelativePath(cwd, setupPath),
    ...analysis.contracts.map((contract) => toPosixRelativePath(cwd, contract.handlerPath)),
    ...middlewareEntriesToValidate.map((entry) => toPosixRelativePath(cwd, entry.filePath)),
  ].filter(Boolean).sort();

  return createCliResult({
    command: 'app check',
    artifactSchemaVersion: 'rettangoli.appCheck/v1',
    ok,
    phase: 'app',
    scope,
    method,
    setup: toPosixRelativePath(cwd, setupPath),
    methodCount: analysis.contracts.length,
    middlewareCount: middlewareEntriesToValidate.length,
    files,
    commands,
    diagnostics,
    nextAction: createNextAction({
      ok,
      failedPhase: ok ? undefined : 'app',
      diagnostics,
      commands,
    }),
  });
};

const appRettangoliBackend = async (options = {}) => {
  const result = await runBackendAppCheck(options);
  const outputFormat = options.format === 'json' || options.json ? 'json' : 'text';

  if (outputFormat === 'json') {
    process.stdout.write(stringifyStableJson(result));
  } else if (result.ok) {
    const suffix = result.method ? ` for ${result.method}` : '';
    console.log(`[App] Backend app check passed${suffix}.`);
  } else {
    const suffix = result.method ? ` for ${result.method}` : '';
    console.error(`[App] Backend app check failed${suffix}.`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
};

export default appRettangoliBackend;
