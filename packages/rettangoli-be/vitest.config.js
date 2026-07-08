import { defineConfig } from 'vitest/config';
import { rettangoliExamplesPlugin } from './src/testing/index.js';

export default defineConfig({
  plugins: [rettangoliExamplesPlugin()],
});
