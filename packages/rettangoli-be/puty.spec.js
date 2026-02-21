import path from 'node:path';
import { setupTestSuiteFromYaml } from 'puty';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

await setupTestSuiteFromYaml(path.join(__dirname, 'spec'));
