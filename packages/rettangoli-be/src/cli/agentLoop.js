import path from 'node:path';

const asArray = (value) => Array.isArray(value) ? value : [];
const DIAGNOSTIC_SCHEMA_VERSION = 'rettangoli.diagnostic/v1';

export const toPosixRelativePath = (cwd, filePath) => {
  if (typeof filePath !== 'string' || !filePath) {
    return undefined;
  }

  if (!path.isAbsolute(filePath)) {
    return filePath.replaceAll(path.sep, '/');
  }

  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
};

export const createScope = ({ method, methods = [] } = {}) => {
  const scopedMethods = method
    ? [method]
    : [...new Set(methods)].sort();

  return {
    type: method ? 'method' : 'project',
    methods: scopedMethods,
    provesProject: !method,
  };
};

const appendOption = (args, flag, value, defaultValue) => {
  if (typeof value === 'string' && value && value !== defaultValue) {
    args.push(flag, value);
  }
};

const appendRepeatedOption = (args, flag, values = [], defaultValues = []) => {
  const normalizedValues = Array.isArray(values) ? values : [values].filter(Boolean);
  const normalizedDefaults = Array.isArray(defaultValues) ? defaultValues : [defaultValues].filter(Boolean);

  if (
    normalizedValues.length === normalizedDefaults.length
    && normalizedValues.every((value, index) => value === normalizedDefaults[index])
  ) {
    return;
  }

  normalizedValues.forEach((value) => {
    appendOption(args, flag, value);
  });
};

const appendBooleanOption = (args, flag, enabled) => {
  if (enabled) {
    args.push(flag);
  }
};

export const createBackendCommands = ({
  commandPrefix = ['rtgl', 'be'],
  dirs = ['./src/modules'],
  method,
  middlewareDir,
  setup,
  outdir,
  migrationsDir,
  config,
  testConfig,
  executable,
  packageManager,
  evidence,
  taskId,
  failOnWarnings = false,
} = {}) => {
  const methodArgs = method ? ['--method', method] : [];
  const dirArgs = [];
  appendRepeatedOption(dirArgs, '--dir', dirs, ['./src/modules']);
  const middlewareArgs = [];
  appendOption(middlewareArgs, '--middleware-dir', middlewareDir, './src/middleware');

  const testArgs = [...dirArgs, ...methodArgs, ...middlewareArgs];
  appendOption(testArgs, '--setup-path', setup, './src/setup.js');
  appendOption(testArgs, '--config', config ?? testConfig, './vitest.config.js');
  appendOption(testArgs, '--runner', executable);
  appendOption(testArgs, '--package-manager', packageManager);

  const manifestArgs = [...dirArgs, ...methodArgs, ...middlewareArgs];
  appendOption(manifestArgs, '--outdir', outdir, './.rtgl-be/generated');
  appendOption(manifestArgs, '--migrations-dir', migrationsDir, './migrations');

  const verifyArgs = [...dirArgs, ...methodArgs, ...middlewareArgs];
  appendOption(verifyArgs, '--setup-path', setup, './src/setup.js');
  appendOption(verifyArgs, '--outdir', outdir, './.rtgl-be/generated');
  appendOption(verifyArgs, '--migrations-dir', migrationsDir, './migrations');
  appendOption(verifyArgs, '--test-config', testConfig ?? config, './vitest.config.js');
  appendOption(verifyArgs, '--runner', executable);
  appendOption(verifyArgs, '--package-manager', packageManager);
  appendBooleanOption(verifyArgs, '--fail-on-warnings', failOnWarnings);
  appendOption(verifyArgs, '--evidence', taskId ?? evidence);

  const dbArgs = [];
  appendOption(dbArgs, '--migrations-dir', migrationsDir, './migrations');
  appendBooleanOption(dbArgs, '--fail-on-warnings', failOnWarnings);
  const appArgs = [...dirArgs, ...methodArgs, ...middlewareArgs];
  appendOption(appArgs, '--setup-path', setup, './src/setup.js');

  return [
    {
      id: 'check',
      argv: [...commandPrefix, 'check', ...dirArgs, ...methodArgs, ...middlewareArgs, '--format', 'json'],
    },
    {
      id: 'manifest',
      argv: [...commandPrefix, 'manifest', ...manifestArgs, '--json'],
    },
    {
      id: 'test',
      argv: [...commandPrefix, 'test', ...testArgs, '--json'],
    },
    {
      id: 'db',
      argv: [...commandPrefix, 'db', 'check', ...dbArgs, '--json'],
    },
    {
      id: 'app',
      argv: [...commandPrefix, 'app', 'check', ...appArgs, '--json'],
    },
    {
      id: 'verify',
      argv: [...commandPrefix, 'verify', ...verifyArgs, '--json'],
    },
  ];
};

export const findCommand = (commands, id) => {
  return commands.find((command) => command.id === id);
};

const removeOptionWithValue = (argv = [], flag) => {
  const next = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === flag) {
      index += 1;
      continue;
    }
    next.push(argv[index]);
  }
  return next;
};

const createFixHint = (ruleId) => {
  const hints = {
    'RTGL-BE-CONTRACT-003': 'Create exactly one .handlers.js file named after the action folder.',
    'RTGL-BE-CONTRACT-004': 'Create exactly one .contract.yaml file named after the action folder.',
    'RTGL-BE-CONTRACT-041': 'Rename or remove the unsupported method package file.',
    'RTGL-BE-CONTRACT-013': 'Remove the middleware reference or create a matching middleware module.',
    'RTGL-BE-CONTRACT-019': 'Change the contract method id to match the method folder path.',
    'RTGL-BE-CONTRACT-042': 'Set params.type to object.',
    'RTGL-BE-CONTRACT-043': 'Set result.type to object.',
    'RTGL-BE-CONTRACT-044': 'Remove JSON-RPC protocol fields from the result schema.',
    'RTGL-BE-CONTRACT-045': 'Move domain error fields into the errors catalog and error examples.',
    'RTGL-BE-CONTRACT-046': 'Fix the examples config document.',
    'RTGL-BE-CONTRACT-047': 'Point the examples file at the local method handler file.',
    'RTGL-BE-CONTRACT-048': 'Remove the examples mode field; contract examples always run through JSON-RPC runtime.',
    'RTGL-BE-CONTRACT-049': 'Fix the examples suite document.',
    'RTGL-BE-CONTRACT-050': 'Add a JSON-RPC request object to the RPC example.',
    'RTGL-BE-CONTRACT-051': 'Set request.method to the contract method id.',
    'RTGL-BE-CONTRACT-052': 'Set out to the expected JSON-RPC response envelope.',
    'RTGL-BE-CONTRACT-005': 'Create exactly one .examples.yaml file next to the method contract.',
    'RTGL-BE-CONTRACT-027': 'Edit the example payload so it matches the params schema.',
    'RTGL-BE-CONTRACT-029': 'Mark the success example with proves.result: success.',
    'RTGL-BE-CONTRACT-031': 'Declare the domain error in the contract or change the example output code.',
    'RTGL-BE-CONTRACT-034': 'Set proves.error to the same domain error code returned by the example.',
    'RTGL-BE-CONTRACT-035': 'Add a proving example for the declared domain error.',
    'RTGL-BE-CONTRACT-036': 'Use an existing method id or create the missing method contract package.',
    'RTGL-BE-CONTRACT-037': 'Add at least one successful example with proves.result: success.',
    'RTGL-BE-CONTRACT-038': 'Add at least one case document to the examples file.',
    'RTGL-BE-CONTRACT-039': "Set 'in' to an array with exactly one object argument.",
    'RTGL-BE-CONTRACT-040': 'Use either proves.result or proves.error, not both.',
    'RTGL-BE-DB-001': 'Rename duplicate migration files so every migration id is unique.',
    'RTGL-BE-DB-002': 'Review the destructive migration statement and make the migration policy explicit.',
    'RTGL-BE-DB-003': 'Fix the SQL in the failing migration file and rerun db check.',
    'RTGL-BE-APP-001': 'Create the configured setup file or pass --setup-path.',
    'RTGL-BE-APP-002': 'Fix the setup file import error.',
    'RTGL-BE-APP-003': 'Export setup or default from the setup file.',
    'RTGL-BE-APP-004': 'Make the setup export an object.',
    'RTGL-BE-APP-005': 'Add setup.deps as an object.',
    'RTGL-BE-APP-006': 'Add the missing setup.deps.<domain> object.',
    'RTGL-BE-APP-007': 'Fix the method handler import.',
    'RTGL-BE-APP-008': 'Fix the referenced middleware import.',
    'RTGL-BE-APP-009': 'Fix app setup, handlers, or middleware so createApp can instantiate.',
    'RTGL-BE-APP-010': 'Export exactly one handler function from the method handler file.',
    'RTGL-BE-APP-011': 'Export a middleware factory that returns a middleware function.',
    'RTGL-BE-TEST-001': 'Add a .examples.yaml file with at least one proving case.',
    'RTGL-BE-TEST-002': 'Fix the failing executable example, handler, or test dependency.',
    'RTGL-BE-TEST-003': 'Create the configured Vitest config file or pass --config.',
  };

  return hints[ruleId];
};

export const normalizeDiagnostic = ({
  cwd = process.cwd(),
  error,
  phase,
  method,
  command,
  extra = {},
}) => {
  const ruleId = error?.code || error?.ruleId || 'UNKNOWN';
  const filePath = toPosixRelativePath(cwd, error?.filePath);

  return {
    schemaVersion: DIAGNOSTIC_SCHEMA_VERSION,
    ruleId,
    code: ruleId,
    severity: 'error',
    phase,
    method: error?.method ?? method,
    filePath,
    file: filePath ? { path: filePath } : undefined,
    jsonPointer: error?.jsonPointer,
    case: error?.case,
    message: error?.message || 'Unknown error.',
    fix: createFixHint(ruleId),
    rerun: command,
    ...extra,
  };
};

export const normalizeDiagnostics = ({
  cwd = process.cwd(),
  errors = [],
  phase,
  method,
  command,
} = {}) => {
  return asArray(errors).map((error) => normalizeDiagnostic({
    cwd,
    error,
    phase,
    method,
    command,
  }));
};

export const createNextAction = ({
  ok,
  failedPhase,
  diagnostics = [],
  commands = [],
  final = false,
} = {}) => {
  const verifyCommand = findCommand(commands, 'verify');

  if (ok) {
    if (!final) {
      return {
        kind: 'verify',
        message: 'Phase passed. Run full backend verification before stopping.',
        argv: verifyCommand?.argv,
      };
    }

    if (verifyCommand?.argv?.includes('--method')) {
      return {
        kind: 'verify',
        message: 'Method verification passed. Run project verification before stopping.',
        argv: removeOptionWithValue(verifyCommand.argv, '--method'),
      };
    }

    return {
      kind: 'done',
      message: 'Verification passed.',
      argv: verifyCommand?.argv,
    };
  }

  const phaseCommandId = failedPhase === 'contracts'
    ? 'check'
    : failedPhase === 'examples'
      ? 'test'
      : failedPhase;
  const command = findCommand(commands, phaseCommandId) ?? verifyCommand;
  const ruleIds = [...new Set(diagnostics.map((diagnostic) => diagnostic.ruleId).filter(Boolean))].sort();
  const targets = [...new Set(
    diagnostics.flatMap((diagnostic) => [
      diagnostic.filePath,
      ...asArray(diagnostic.files),
    ].filter(Boolean)),
  )].sort();
  const target = failedPhase === 'test'
    ? 'examples-or-handler'
    : failedPhase === 'build'
      ? 'backend-build'
      : failedPhase === 'db'
        ? 'database-migrations'
        : failedPhase === 'app'
          ? 'runtime-app'
          : 'contract-package';

  return {
    kind: 'fix',
    phase: failedPhase,
    target,
    ruleIds,
    files: targets,
    argv: command?.argv,
  };
};

export const collectSourceFilesFromManifest = (manifest) => {
  const files = [];

  Object.values(manifest?.methods ?? {}).forEach((method) => {
    if (Array.isArray(method.files?.owned)) {
      files.push(...method.files.owned);
      return;
    }

    Object.values(method.source ?? {}).forEach((filePath) => {
      if (typeof filePath === 'string' && filePath) {
        files.push(filePath);
      }
    });
  });

  return [...new Set(files)].sort();
};
