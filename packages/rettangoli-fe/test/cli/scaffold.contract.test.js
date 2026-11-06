import path from "node:path";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { load as loadYaml } from "js-yaml";
import { afterEach, describe, expect, it, vi } from "vitest";
import scaffold from "../../src/cli/scaffold.js";
import check from "../../src/cli/check.js";

const PKG = path.resolve(import.meta.dirname, "../..");

describe("scaffold cli contracts", () => {
  const createdDirs = [];
  const originalExitCode = process.exitCode;

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  const createRoot = () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-scaffold-"));
    createdDirs.push(rootDir);
    return rootDir;
  };

  it("generates schema-first component files that pass contract check", () => {
    const rootDir = createRoot();

    vi.spyOn(console, "log").mockImplementation(() => {});
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

    expect(schema.componentName).toBe("custom-login-form");
    expect(view.template).toEqual([{ "rtgl-view w=f h=f p=md": [{ "rtgl-text s=h2": "loginForm" }] }]);
    expect(Object.prototype.hasOwnProperty.call(view, "elementName")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "viewDataSchema")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "propsSchema")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "events")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(view, "methods")).toBe(false);

    process.exitCode = undefined;
    expect(() => check({
      cwd: rootDir,
      dirs: ["components"],
    })).not.toThrow();
    expect(process.exitCode).toBeUndefined();
  });

  it.each([
    ["MyButton", "custom-my-button"],
    ["my-button", "custom-my-button"],
    ["HomePage", "custom-home-page"],
    ["blankSlate", "custom-blank-slate"],
    ["blank-page", "custom-blank-page"],
    ["blankslate", "custom-blankslate"],
  ])("turns %s into the element name %s", (componentName, elementName) => {
    const rootDir = createRoot();
    vi.spyOn(console, "log").mockImplementation(() => {});
    scaffold({ dir: rootDir, category: "components", componentName });
    const schema = loadYaml(readFileSync(
      path.join(rootDir, "components", componentName, `${componentName}.schema.yaml`),
      "utf8",
    ));
    expect(schema.componentName).toBe(elementName);
    const view = loadYaml(readFileSync(
      path.join(rootDir, "components", componentName, `${componentName}.view.yaml`),
      "utf8",
    ));
    expect(view.template).toEqual([{ "rtgl-view w=f h=f p=md": [{ "rtgl-text s=h2": componentName }] }]);
  });

  it("throws for a name that gives no valid element name, before creating anything", () => {
    const rootDir = createRoot();
    expect(() => scaffold({ dir: rootDir, category: "components", componentName: "my button" })).toThrow(
      '[Scaffold] "my button" gives the element name "custom-my button", which is not a valid custom element name.',
    );
    expect(readdirSync(rootDir)).toEqual([]);
  });

  it("works when the package is installed under a path with a space", () => {
    const rootDir = createRoot();
    const installDir = path.join(rootDir, "space dir");
    mkdirSync(installDir);
    cpSync(path.join(PKG, "src"), path.join(installDir, "src"), { recursive: true });
    symlinkSync(path.resolve(PKG, "../../node_modules"), path.join(installDir, "node_modules"));
    const scaffoldUrl = pathToFileURL(path.join(installDir, "src/cli/scaffold.js")).href;

    execFileSync(process.execPath, [
      "--input-type=module",
      "-e",
      `const { default: scaffold } = await import(${JSON.stringify(scaffoldUrl)});
scaffold({ dir: ${JSON.stringify(path.join(rootDir, "out"))}, category: "components", componentName: "card" });`,
    ], { stdio: "pipe" });

    expect(readdirSync(path.join(rootDir, "out/components/card")).sort()).toEqual([
      "card.handlers.js",
      "card.schema.yaml",
      "card.store.js",
      "card.view.yaml",
    ]);
  });
});
