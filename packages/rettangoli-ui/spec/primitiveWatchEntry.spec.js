import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const readSource = (relativePath) =>
  readFileSync(path.join(packageDir, relativePath), "utf8");

describe("primitive watch entry", () => {
  it("keeps production registration separate from the HMR shell", () => {
    const productionEntry = readSource("src/entry-iife-ui.js");
    const productionRegistration = readSource("src/registerPrimitives.js");
    const watchEntry = readSource("src/entry-watch.js");

    expect(productionEntry).toContain('import "./registerPrimitives.js";');
    expect(productionRegistration).not.toContain("import.meta.hot");
    expect(watchEntry).toContain('import "./registerHotPrimitives.js";');
    expect(watchEntry).not.toContain('import "./registerPrimitives.js";');
  });

  it("accepts primitive modules that terminate transitive helper updates", () => {
    const registration = readSource("src/registerHotPrimitives.js");
    const view = readSource("src/primitives/view.js");
    const grid = readSource("src/primitives/grid.js");

    expect(registration).toContain("import.meta.hot.accept(");
    expect(registration).toContain(
      'import.meta.hot.on("vite:beforeUpdate"',
    );
    expect(registration).toContain(
      'import.meta.hot.on("vite:afterUpdate"',
    );
    expect(registration).toContain('"./primitives/view.js"');
    expect(registration).toContain('"./primitives/grid.js"');
    expect(registration).toContain('"./primitives/input.js"');
    expect(registration).toContain('"./primitives/input-date.js"');
    expect(view).toContain('from "../common/overlayScrollbar.js"');
    expect(grid).toContain('from "../common/overlayScrollbar.js"');
    expect(view).toContain("prepareOverlayScrollbarControllerHotUpdate");
    expect(grid).toContain("prepareOverlayScrollbarControllerHotUpdate");
  });
});
