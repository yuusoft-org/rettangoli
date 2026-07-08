import path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stringifyStableJson } from './json.js';

const toPosixRelativePath = (cwd, filePath) => {
  if (!path.isAbsolute(filePath)) {
    return filePath.replaceAll(path.sep, '/');
  }
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
};

const hashFile = (filePath) => {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return `sha256:${hash.digest('hex')}`;
};

const hashJson = (value) => {
  const hash = createHash('sha256');
  hash.update(stringifyStableJson(value));
  return `sha256:${hash.digest('hex')}`;
};

const writeJson = (filePath, value) => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, stringifyStableJson(value));
};

const collectAnchorFiles = (result) => {
  return [
    ...(result.files?.owned ?? []),
    ...(result.files?.shared ?? []),
    ...(result.files?.write ?? []),
  ].filter(Boolean).sort();
};

const evidenceStatus = (step) => {
  if (step?.skipped) {
    return 'skipped';
  }
  return step?.ok ? 'passed' : 'failed';
};

export const createBackendTaskAnchor = ({
  cwd = process.cwd(),
  taskId,
  result,
} = {}) => {
  const files = collectAnchorFiles(result);
  return {
    schemaVersion: 'rettangoli.taskAnchor/v1',
    taskId,
    scope: result.scope,
    goal: `verify ${result.scope?.type ?? 'backend'}`,
    ok: result.ok,
    failedPhase: result.failedPhase,
    commands: result.commands,
    nextAction: result.nextAction,
    hashes: {
      result: hashJson(result),
      files: Object.fromEntries(files.map((filePath) => [
        filePath,
        hashFile(path.resolve(cwd, filePath)),
      ])),
    },
  };
};

export const writeBackendVerifyEvidence = ({
  cwd = process.cwd(),
  taskId,
  result,
  manifest,
} = {}) => {
  if (!taskId) {
    return undefined;
  }

  const evidenceDir = path.join(cwd, '.rtgl-be', 'evidence', taskId);
  const taskDir = path.join(cwd, '.rtgl-be', 'tasks');
  const paths = {
    verify: path.join(evidenceDir, 'verify.json'),
    check: path.join(evidenceDir, 'check.json'),
    build: path.join(evidenceDir, 'build.json'),
    manifest: path.join(evidenceDir, 'manifest.json'),
    db: path.join(evidenceDir, 'db.json'),
    test: path.join(evidenceDir, 'test.json'),
    task: path.join(taskDir, `${taskId}.json`),
  };
  const doneCriteria = [
    {
      id: 'contracts-valid',
      status: evidenceStatus(result.check),
      evidence: toPosixRelativePath(cwd, paths.check),
    },
    {
      id: 'build-plan-valid',
      status: evidenceStatus(result.build),
      evidence: toPosixRelativePath(cwd, paths.build),
    },
    {
      id: 'manifest-current',
      status: evidenceStatus(result.manifest),
      evidence: toPosixRelativePath(cwd, paths.manifest),
    },
    {
      id: 'sqlite-migrations-valid',
      status: evidenceStatus(result.db),
      evidence: toPosixRelativePath(cwd, paths.db),
    },
    {
      id: 'examples-prove-contract',
      status: evidenceStatus(result.test),
      evidence: toPosixRelativePath(cwd, paths.test),
    },
  ];
  const evidence = {
    schemaVersion: 'rettangoli.verifyEvidence/v1',
    taskId,
    ok: result.ok,
    scope: result.scope,
    failedPhase: result.failedPhase,
    doneCriteria,
    paths: Object.fromEntries(
      Object.entries(paths).map(([key, filePath]) => [key, toPosixRelativePath(cwd, filePath)]),
    ),
  };
  const resultWithEvidence = {
    ...result,
    evidence,
    doneCriteria,
  };
  const anchor = createBackendTaskAnchor({
    cwd,
    taskId,
    result: resultWithEvidence,
  });

  writeJson(paths.check, result.check ?? {});
  writeJson(paths.build, result.build ?? {});
  writeJson(paths.manifest, manifest ?? result.manifest ?? {});
  writeJson(paths.db, result.db ?? {});
  writeJson(paths.test, result.test ?? {});
  writeJson(paths.verify, resultWithEvidence);
  writeJson(paths.task, anchor);

  return {
    evidence,
    anchor,
    result: resultWithEvidence,
  };
};

export const resolveAffectedMethods = ({ manifest, filePaths = [] } = {}) => {
  const normalizedFiles = filePaths.map((filePath) => filePath.replaceAll(path.sep, '/'));
  const affected = new Set();
  let project = false;

  normalizedFiles.forEach((filePath) => {
    Object.entries(manifest?.methods ?? {}).forEach(([method, entry]) => {
      if ((entry.files?.owned ?? Object.values(entry.source ?? {})).includes(filePath)) {
        affected.add(method);
      }
      if ((entry.files?.shared ?? []).includes(filePath)) {
        affected.add(method);
      }
    });

    if (
      filePath.startsWith('.rtgl-be/')
      || filePath.endsWith('rettangoli.config.yaml')
      || filePath === 'src/setup.js'
      || filePath === 'package.json'
    ) {
      project = true;
    }
  });

  return {
    schemaVersion: 'rettangoli.affectedMethods/v1',
    scope: project ? 'project' : affected.size === 1 ? 'method' : affected.size > 1 ? 'methods' : 'unknown',
    project,
    methods: [...affected].sort(),
    files: normalizedFiles.sort(),
  };
};

export const runBackendResume = ({ cwd = process.cwd(), taskId } = {}) => {
  const taskPath = path.join(cwd, '.rtgl-be', 'tasks', `${taskId}.json`);
  if (!taskId || !existsSync(taskPath)) {
    return {
      schemaVersion: 'rettangoli.resume/v1',
      ok: false,
      taskId,
      diagnostics: [
        {
          schemaVersion: 'rettangoli.diagnostic/v1',
          ruleId: 'RTGL-BE-RESUME-001',
          code: 'RTGL-BE-RESUME-001',
          severity: 'error',
          phase: 'resume',
          filePath: toPosixRelativePath(cwd, taskPath),
          message: `Task anchor not found for '${taskId}'.`,
        },
      ],
    };
  }

  const anchor = JSON.parse(readFileSync(taskPath, 'utf8'));
  const changedFiles = Object.entries(anchor.hashes?.files ?? {})
    .filter(([filePath, expectedHash]) => hashFile(path.resolve(cwd, filePath)) !== expectedHash)
    .map(([filePath]) => filePath)
    .sort();

  return {
    schemaVersion: 'rettangoli.resume/v1',
    ok: changedFiles.length === 0,
    taskId,
    scope: anchor.scope,
    changedFiles,
    nextAction: changedFiles.length === 0
      ? anchor.nextAction
      : {
          kind: 'verify',
          message: 'Files changed since task anchor. Re-run verification before continuing.',
          argv: anchor.commands?.find((command) => command.id === 'verify')?.argv,
        },
  };
};
