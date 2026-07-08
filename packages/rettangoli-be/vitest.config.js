import { defineConfig } from 'vitest/config';
import { putyPlugin } from 'puty/vitest';
import { rettangoliExamplesPlugin } from './src/testing/index.js';

export default defineConfig({
  plugins: [putyPlugin(), rettangoliExamplesPlugin()],
});
