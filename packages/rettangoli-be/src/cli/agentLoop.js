import path from 'node:path';

const asArray = (value) => Array.isArray(value) ? value : [];

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

export const createBackendCommands = ({
  method,
  middlewareDir,
  setup,
  outdir,
  config,
  testConfig,
  executable,
  packageManager,
} = {}) => {
  const methodArgs = method ? ['--method', method] : [];
  const middlewareArgs = [];
  appendOption(middlewareArgs, '--middleware-dir', middlewareDir, './src/middleware');

  const testArgs = [...methodArgs, ...middlewareArgs];
  appendOption(testArgs, '--config', config ?? testConfig, './vitest.config.js');
  appendOption(testArgs, '--runner', executable);
  appendOption(testArgs, '--package-manager', packageManager);

  const verifyArgs = [...methodArgs, ...middlewareArgs];
  appendOption(verifyArgs, '--setup-path', setup, './src/setup.js');
  appendOption(verifyArgs, '--outdir', outdir, './.rtgl-be/generated');
  appendOption(verifyArgs, '--test-config', testConfig ?? config, './vitest.config.js');
  appendOption(verifyArgs, '--runner', executable);
  appendOption(verifyArgs, '--package-manager', packageManager);

  return [
    {
      id: 'check',
      argv: ['rtgl', 'be', 'check', ...methodArgs, ...middlewareArgs, '--format', 'json'],
    },
    {
      id: 'manifest',
      argv: ['rtgl', 'be', 'manifest', ...methodArgs, ...middlewareArgs, '--json'],
    },
    {
      id: 'test',
      argv: ['rtgl', 'be', 'test', ...testArgs, '--json'],
    },
    {
      id: 'verify',
      argv: ['rtgl', 'be', 'verify', ...verifyArgs, '--json'],
    },
  ];
};

export const findCommand = (commands, id) => {
  return commands.find((command) => command.id === id);
};

const createFixHint = (ruleId) => {
  const hints = {
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
    'RTGL-BE-TEST-001': 'Add a .examples.yaml file with at least one proving case.',
    'RTGL-BE-TEST-002': 'Fix the failing executable example, handler, or test dependency.',
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
    ruleId,
    code: ruleId,
    severity: 'error',
    phase,
    method: error?.method ?? method,
    filePath,
    file: filePath ? { path: filePath } : undefined,
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
    Object.values(method.source ?? {}).forEach((filePath) => {
      if (typeof filePath === 'string' && filePath) {
        files.push(filePath);
      }
    });
  });

  return [...new Set(files)].sort();
};
