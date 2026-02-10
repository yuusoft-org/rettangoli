import path from "node:path";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { load as loadYaml } from "js-yaml";
import { afterEach, describe, expect, it } from "vitest";
import scaffold from "../../src/cli/scaffold.js";
import check from "../../src/cli/check.js";

describe("scaffold cli contracts", () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it("generates schema-first component files that pass contract check", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-scaffold-"));
    createdDirs.push(rootDir);

    scaffold({
      dir: rootDir,
      category: "components",
      componentName: "loginForm",
    });

    const componentDir = path.join(rootDir, "components", "loginForm");
    const schemaPath = path.join(componentDir, "loginForm.schema.yaml");
    const viewPath = path.join(componentDir, "loginForm.view.yaml");
    const schema = loadYaml(readFileSync(schemaPath, "utf8"));
    const view = loadYaml(readFileSync(viewPath, "utf8"));

    expect(schema.componentName).toBe("custom-loginForm");
    expect(Object.prototype.hasOwnProperty.call(view, "elementName")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "viewDataSchema")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "propsSchema")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "events")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "methods")).toBe(false);

    expect(() => check({
      cwd: rootDir,
      dirs: ["components"],
    })).not.toThrow();
  });
});
