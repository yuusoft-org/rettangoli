import path from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import check from "../../src/cli/check.js";

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
});
