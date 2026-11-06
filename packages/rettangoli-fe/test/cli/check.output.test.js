import path from "node:path";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import check from "../../src/cli/check.js";
import examples from "../../src/cli/examples.js";

const writeComponentFiles = ({
  rootDir,
  componentName = "loginForm",
  includeSchema = false,
  viewYaml = "template: []\n",
}) => {
  const componentDir = path.join(rootDir, "components", componentName);
  mkdirSync(componentDir, { recursive: true });
  writeFileSync(path.join(componentDir, `${componentName}.view.yaml`), viewYaml);
  if (includeSchema) {
    writeFileSync(
      path.join(componentDir, `${componentName}.schema.yaml`),
      `componentName: rtgl-${componentName}\n`,
    );
  }
};

describe("check cli output modes", () => {
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

  it("prints grouped text report and sets non-zero exit code on failures", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-check-text-"));
    createdDirs.push(rootDir);
    writeComponentFiles({ rootDir, includeSchema: false });

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    check({
      cwd: rootDir,
      dirs: ["components"],
      format: "text",
    });

    expect(process.exitCode).toBe(1);
    const report = errorSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(report).toContain("[Check] Component contract validation failed:");
    expect(report).toContain("By rule:");
    expect(report).toContain("RTGL-CONTRACT-001");
    expect(report).toContain("By component:");
    expect(report).toContain("components/loginForm");
  });

  it("prints machine-readable json report", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-check-json-"));
    createdDirs.push(rootDir);
    writeComponentFiles({ rootDir, includeSchema: false });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    check({
      cwd: rootDir,
      dirs: ["components"],
      format: "json",
    });

    expect(process.exitCode).toBe(1);
    const printed = logSpy.mock.calls[0][0];
    const payload = JSON.parse(printed);
    expect(payload.ok).toBe(false);
    expect(payload.summary.total).toBe(1);
    expect(payload.summary.byCode[0].code).toBe("RTGL-CONTRACT-001");
  });

  it("reports i18n view usage without fe.i18n config", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-check-i18n-"));
    createdDirs.push(rootDir);
    writeComponentFiles({
      rootDir,
      includeSchema: true,
      viewYaml: [
        "template:",
        "  - div: ${i18n.common.title}",
        "",
      ].join("\n"),
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    check({
      cwd: rootDir,
      dirs: ["components"],
      format: "json",
    });

    expect(process.exitCode).toBe(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0]);
    expect(payload.summary.byCode[0].code).toBe("RTGL-I18N-002");
  });
});

describe("check cli output contract", () => {
  const PKG = path.resolve(import.meta.dirname, "../..");
  const GOLDEN_DIR = path.join(import.meta.dirname, "__goldens__");
  const MULTI_ERROR_DIR = path.join(import.meta.dirname, "fixtures/multi-error");
  const originalExitCode = process.exitCode;
  const createdDirs = [];

  afterEach(() => {
    createdDirs.splice(0).forEach((dirPath) => rmSync(dirPath, { recursive: true, force: true }));
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  // What a user sees: stdout, stderr and the exit code, paths made portable.
  const run = (options, root) => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.exitCode = undefined;
    check(options);
    const exitCode = process.exitCode;
    const lines = (spy) => spy.mock.calls.map((call) => call.join(" ")).join("\n").replaceAll(root, "<ROOT>");
    const result = { stdout: lines(logSpy), stderr: lines(errorSpy), exitCode };
    logSpy.mockRestore();
    errorSpy.mockRestore();
    return result;
  };

  const expectGolden = (name, actual) => {
    const goldenPath = path.join(GOLDEN_DIR, name);
    if (process.env.UPDATE_GOLDENS === "1") {
      mkdirSync(GOLDEN_DIR, { recursive: true });
      writeFileSync(goldenPath, `${actual}\n`);
      return;
    }
    expect(existsSync(goldenPath), `missing golden ${name}; run with UPDATE_GOLDENS=1`).toBe(true);
    expect(`${actual}\n`).toBe(readFileSync(goldenPath, "utf8"));
  };

  it("prints the json report of a valid app and leaves the exit code alone", () => {
    const result = run({ cwd: path.join(PKG, "e2e/dashboard"), dirs: ["fe/components"], format: "json" }, PKG);
    expect(result.exitCode).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      ok: true,
      prefix: "[Check]",
      componentCount: 4,
      summary: { total: 0, byCode: [], byComponent: [] },
    });
    expect(result.stdout).toBe(JSON.stringify(JSON.parse(result.stdout), null, 2));
  });

  it("prints one line for a valid app in text format", () => {
    const result = run({ cwd: path.join(PKG, "e2e/dashboard"), dirs: ["fe/components"] }, PKG);
    expect(result).toEqual({
      stdout: "[Check] Component contracts passed for 4 component(s).",
      stderr: "",
      exitCode: undefined,
    });
  });

  it("counts a valid app that uses i18n the same way once the i18n config is passed", () => {
    const result = run({
      cwd: path.join(PKG, "e2e/interactions"),
      dirs: ["fe/components"],
      format: "json",
      i18n: { dir: "fe/i18n", defaultLocale: "en", fallbackLocale: "en", locales: ["en", "vi"] },
    }, PKG);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, componentCount: 4 });
    expect(result.exitCode).toBeUndefined();
  });

  it("prints the exact json report for one missing schema", () => {
    const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-check-one-"));
    createdDirs.push(rootDir);
    writeComponentFiles({ rootDir, includeSchema: false });
    const result = run({ cwd: rootDir, dirs: ["components"], format: "json" }, rootDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toEqual({
      ok: false,
      prefix: "[Check]",
      summary: {
        total: 1,
        byCode: [{ code: "RTGL-CONTRACT-001", count: 1 }],
        byComponent: [{ component: "components/loginForm", count: 1 }],
      },
      errors: [{
        code: "RTGL-CONTRACT-001",
        message: "components/loginForm: missing required .schema.yaml file.",
        filePath: "<ROOT>/components/loginForm/loginForm.view.yaml",
      }],
    });
  });

  describe("an app with errors in components whose names collide on case and hyphens", () => {
    const options = { cwd: MULTI_ERROR_DIR, dirs: ["components", "pages"] };

    it("prints the json report in file order", () => {
      const result = run({ ...options, format: "json" }, MULTI_ERROR_DIR);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe("");
      expectGolden("check-multi-error-json.txt", result.stdout);
    });

    it("prints the text report in file order", () => {
      const result = run({ ...options, format: "text" }, MULTI_ERROR_DIR);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expectGolden("check-multi-error-text.txt", result.stderr);
    });

    it("reports components in directory order, then byte order of their folder names", () => {
      const { errors } = JSON.parse(run({ ...options, format: "json" }, MULTI_ERROR_DIR).stdout);
      expect(errors.map((error) => [error.code, error.message.split(":")[0]])).toEqual([
        ["RTGL-CONTRACT-002", "components/foo-bar"],
        ["RTGL-CONTRACT-001", "components/fooBar"],
        ["RTGL-CONTRACT-003", "pages/FooBar"],
      ]);
      const reversed = JSON.parse(run({ ...options, dirs: ["pages", "components"], format: "json" }, MULTI_ERROR_DIR).stdout);
      expect(reversed.errors.map((error) => error.message.split(":")[0])).toEqual([
        "pages/FooBar",
        "components/foo-bar",
        "components/fooBar",
      ]);
    });
  });

  describe("YAML that does not parse", () => {
    const createProject = (files) => {
      const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-check-yaml-"));
      createdDirs.push(rootDir);
      for (const [relativePath, content] of Object.entries(files)) {
        const filePath = path.join(rootDir, relativePath);
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, content);
      }
      return rootDir;
    };
    const messageOf = (fn, rootDir) => {
      try {
        fn();
      } catch (error) {
        return error.message.replaceAll(rootDir, "<ROOT>");
      }
      throw new Error("expected a throw");
    };

    it("check throws, naming the file", () => {
      const rootDir = createProject({
        "components/a/a.schema.yaml": "componentName: x-a\n",
        "components/a/a.view.yaml": "template: [unclosed\n",
      });
      expect(messageOf(() => check({ cwd: rootDir, dirs: ["components"], format: "json" }), rootDir)).toBe(
        "[Check] Failed to read or parse <ROOT>/components/a/a.view.yaml: "
        + "unexpected end of the stream within a flow collection (2:1)\n\n"
        + " 1 | template: [unclosed\n"
        + " 2 | \n"
        + "-----^",
      );
    });

    // Known gap: examples reports js-yaml's own message, with no file path.
    it("examples throws js-yaml's message without a file name", () => {
      const rootDir = createProject({
        "components/a/a.view.yaml": "template: [unclosed\n",
        "components/a/a.examples.yaml": "name: config\n---\nname: one\nviewData: {}\n",
      });
      expect(messageOf(
        () => examples({ dirs: [path.join(rootDir, "components")], outputDir: path.join(rootDir, "out") }),
        rootDir,
      )).toBe(
        "unexpected end of the stream within a flow collection (2:1)\n\n"
        + " 1 | template: [unclosed\n"
        + " 2 | \n"
        + "-----^",
      );
    });

    it("examples throws js-yaml's message for a broken examples file too", () => {
      const rootDir = createProject({
        "components/a/a.view.yaml": "template:\n  - p: x\n",
        "components/a/a.examples.yaml": "name: config\n---\nname: [one\nviewData: {}\n",
      });
      expect(messageOf(
        () => examples({ dirs: [path.join(rootDir, "components")], outputDir: path.join(rootDir, "out") }),
        rootDir,
      )).toBe(
        "missed comma between flow collection entries (4:1)\n\n"
        + " 1 | name: config\n"
        + " 2 | ---\n"
        + " 3 | name: [one\n"
        + " 4 | viewData: {}\n"
        + "-----^",
      );
    });
  });
});
