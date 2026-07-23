import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("UI VT watch integration", () => {
  it("keeps static registration blocking and configures the watch HMR entry", () => {
    const template = readFileSync(
      path.join(packageDir, "vt", "templates", "default.html"),
      "utf8",
    );
    const config = readFileSync(
      path.join(packageDir, "rettangoli.config.yaml"),
      "utf8",
    );
    const watchEntry = readFileSync(
      path.join(packageDir, "src", "entry-watch.js"),
      "utf8",
    );

    expect(template).toContain('<script src="/public/main.js"></script>');
    expect(template).not.toContain(
      '<script type="module" src="/public/main.js"></script>',
    );
    expect(config).toMatch(/^\s+outfile: "vt\/static\/public\/main\.js"/m);
    expect(config).toMatch(/^\s+watchVt: true/m);
    expect(config).toMatch(/^\s+watchEntry: "src\/entry-watch\.js"/m);
    expect(watchEntry).toContain('import "./registerHotPrimitives.js";');
    expect(watchEntry).not.toContain('import "./registerPrimitives.js";');
    expect(watchEntry).toContain('import "virtual:rettangoli-fe-entry";');
  });
});
