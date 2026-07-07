import { defineConfig } from 'vitest/config';
import { putyPlugin } from 'puty/vitest';
import path from 'node:path';

const putyExamplesPlugin = () => ({
  name: 'vitest:puty-examples',
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
    return {
      code: [
        "import { setupTestSuiteFromYaml } from 'puty';",
        `await setupTestSuiteFromYaml('${yamlDir}', '${path.basename(id)}');`,
        '',
      ].join('\n'),
      map: null,
    };
  },
});

export default defineConfig({
  plugins: [putyPlugin(), putyExamplesPlugin()],
});
