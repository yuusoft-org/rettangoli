import { createDeps } from './deps/index.js';
import { withRequestId } from './middleware/withRequestId.js';
import { withLogger } from './middleware/withLogger.js';
import { withAuthUser } from './middleware/withAuthUser.js';
import { registerHealthModule } from './modules/health/module.js';
import { registerUserModule } from './modules/user/module.js';

// Placeholder: runtime package design target
import { createRuntime } from '@rettangoli/be';

const mergeRecordsOrThrow = ({ target, source, label }) => {
  for (const [key, value] of Object.entries(source)) {
    if (target[key]) {
      throw new Error(`setup: duplicate ${label} ${key}`);
    }
    target[key] = value;
  }
};

const resolveModules = ({ deps }) => {
  return [
    registerHealthModule({ deps }),
    registerUserModule({ deps }),
  ];
};

export const port = Number(process.env.PORT || 3000);

export const setup = ({ deps: depsOverride } = {}) => {
  const deps = depsOverride || createDeps({ env: process.env });

  const methods = {};
  const contracts = {};

  for (const moduleDef of resolveModules({ deps })) {
    mergeRecordsOrThrow({ target: methods, source: moduleDef.methods, label: 'method' });
    mergeRecordsOrThrow({ target: contracts, source: moduleDef.contracts, label: 'contract' });
  }

  return createRuntime({
    deps,
    methods,
    contracts,
    middleware: [
      withRequestId({
        createId: () => `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }),
      withLogger(),
      withAuthUser(),
    ],
  });
};
