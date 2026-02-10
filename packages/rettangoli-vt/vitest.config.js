import { defineConfig } from "vitest/config";
import { putyPlugin } from "puty/vitest";

export default defineConfig({
  plugins: [putyPlugin()],
});
