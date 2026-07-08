import path from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAll as loadAllYaml } from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { setupTestSuiteFromYaml } from 'puty';
import { createAppFromProject } from '../runtime/createAppFromProject.js';

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const readExampleDocuments = (yamlDir, yamlFile) => {
  const documents = [];
  const content = readFileSync(path.join(yamlDir, yamlFile), 'utf8');
  loadAllYaml(content, (doc) => documents.push(doc ?? {}));
  return documents;
};

const createRpcDispatchInput = (caseDoc) => {
  const input = Array.isArray(caseDoc.in) && isPlainObject(caseDoc.in[0]) ? caseDoc.in[0] : {};
  return {
    request: caseDoc.request ?? input.request,
    meta: caseDoc.meta ?? input.meta,
    cookies: caseDoc.cookies ?? input.cookies,
    context: caseDoc.context ?? input.context,
  };
};

const resolveRuntimeOptions = ({ configDocument, options }) => {
  const runtime = isPlainObject(configDocument.runtime) ? configDocument.runtime : {};
  return {
    cwd: runtime.cwd ? path.resolve(process.cwd(), runtime.cwd) : options.cwd ?? process.cwd(),
    methodDirs: runtime.methodDirs ?? options.methodDirs ?? ['./src/modules'],
    middlewareDirs: runtime.middlewareDirs ?? options.middlewareDirs ?? ['./src/middleware'],
    setupPath: runtime.setupPath ?? options.setupPath ?? './src/setup.js',
  };
};

const setupRpcExamplesFromYaml = async (yamlDir, yamlFile, options = {}) => {
  const documents = readExampleDocuments(yamlDir, yamlFile);
  const configDocument = documents[0] ?? {};
  const suiteDocument = documents[1] ?? {};
  const caseDocuments = documents
    .filter((doc) => isPlainObject(doc) && Object.prototype.hasOwnProperty.call(doc, 'case'));
  const runtimeOptions = resolveRuntimeOptions({ configDocument, options });
  const appPromise = createAppFromProject({
    cwd: runtimeOptions.cwd,
    methodDirs: runtimeOptions.methodDirs,
    middlewareDirs: runtimeOptions.middlewareDirs,
    setupPath: runtimeOptions.setupPath,
  });
  const suiteName = suiteDocument.suite || configDocument.group || yamlFile;

  describe(suiteName, () => {
    caseDocuments.forEach((caseDoc) => {
      it(caseDoc.case, async () => {
        const app = await appPromise;
        const { response } = await app.dispatchWithContext(createRpcDispatchInput(caseDoc));
        expect(response).toEqual(caseDoc.out);
      });
    });
  });
};

export const setupRettangoliExamplesFromYaml = async (yamlDir, yamlFile, options = {}) => {
  const documents = readExampleDocuments(yamlDir, yamlFile);
  const mode = documents[0]?.mode ?? 'handler';

  if (mode === 'handler') {
    await setupTestSuiteFromYaml(yamlDir, yamlFile);
    return;
  }

  if (mode === 'rpc') {
    await setupRpcExamplesFromYaml(yamlDir, yamlFile, options);
    return;
  }

  throw new Error(`Unsupported Rettangoli examples mode '${mode}' in ${yamlFile}`);
};

export const rettangoliExamplesPlugin = (options = {}) => ({
  name: 'vitest:rettangoli-examples',
  config() {
    return {
      test: {
        include: [
          '**/*.examples.{yaml,yml}',
        ],
      },
    };
  },
  transform(_code, id) {
    if (!/\.examples\.(yaml|yml)$/.test(id)) {
      return null;
    }

    const yamlDir = path.dirname(id);
    const helperOptions = JSON.stringify(options);
    return {
      code: [
        "import { setupRettangoliExamplesFromYaml } from '@rettangoli/be/testing';",
        `await setupRettangoliExamplesFromYaml('${yamlDir}', '${path.basename(id)}', ${helperOptions});`,
        '',
      ].join('\n'),
      map: null,
    };
  },
});
