import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pinned, not inherited. Several suites assert that this package is
    // importable with NO DOM at all (test/server/node-environment.test.js) —
    // the property that makes server rendering and HTML goldens possible.
    // Switching this to "jsdom" would supply `window`/`document` globally and
    // turn those guards into assertions about jsdom instead of about Node.
    environment: "node",
  },
});
