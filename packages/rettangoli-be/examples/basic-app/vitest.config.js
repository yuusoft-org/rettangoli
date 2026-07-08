import { defineConfig } from 'vitest/config';
import { putyPlugin } from 'puty/vitest';
import { rettangoliExamplesPlugin } from '@rettangoli/be/testing';

export default defineConfig({
  plugins: [putyPlugin(), rettangoliExamplesPlugin()],
});
