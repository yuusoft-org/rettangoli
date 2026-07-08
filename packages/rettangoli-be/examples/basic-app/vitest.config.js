import { defineConfig } from 'vitest/config';
import { rettangoliExamplesPlugin } from '@rettangoli/be/testing';

export default defineConfig({
  plugins: [rettangoliExamplesPlugin()],
});
