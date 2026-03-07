import path from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { generateFrontendEntrySource } from "../../src/cli/frontendEntrySource.js";

const toPosixPath = (value) => value.split(path.sep).join("/");

const createFixtureProject = ({
  setupSource = "export const deps = { components: {} };",
  constantsSource = null,
  viewSource = "template:\n  - 'div#root':\n",
  includeSchema = true,
} = {}) => {
  const rootDir = mkdtempSync(path.join(tmpdir(), "rtgl-fe-vite-entry-"));
  const componentDir = path.join(rootDir, "components", "counter");
  mkdirSync(componentDir, { recursive: true });

  writeFileSync(path.join(rootDir, "setup.js"), setupSource);
  if (includeSchema) {
    writeFileSync(
      path.join(componentDir, "counter.schema.yaml"),
      "componentName: x-counter\n",
    );
  }
  writeFileSync(path.join(componentDir, "counter.view.yaml"), viewSource);
  writeFileSync(
    path.join(componentDir, "counter.store.js"),
    "export const createInitialState = () => ({ count: 0 });\n",
  );

  if (constantsSource !== null) {
    writeFileSync(
      path.join(componentDir, "counter.constants.yaml"),
      constantsSource,
    );
  }

  return rootDir;
};

describe("frontend entry source generator", () => {
  const createdDirs = [];

  afterEach(() => {
    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it("generates build-mode source with component registrations", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "build",
      errorPrefix: "[Build]",
    });

    const setupPath = toPosixPath(path.join(rootDir, "setup.js"));
    const storePath = toPosixPath(
      path.join(rootDir, "components", "counter", "counter.store.js"),
    );

    expect(source).toContain(`import { deps } from "${setupPath}";`);
    expect(source).toContain(`from "${storePath}";`);
    expect(source).toContain(`imports["components"]["counter"]["store"]`);
    expect(source).toContain("customElements.define(elementName, webComponent);");
  });

  it("generates serve-mode source with /@fs imports", () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const source = generateFrontendEntrySource({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      command: "serve",
      errorPrefix: "[Watch]",
    });

    const setupPath = toPosixPath(path.join(rootDir, "setup.js"));
    const storePath = toPosixPath(
      path.join(rootDir, "components", "counter", "counter.store.js"),
    );

    expect(source).toContain(`import { deps } from "/@fs${setupPath}";`);
    expect(source).toContain(`from "/@fs${storePath}";`);
  });

  it("uses provided error prefix for invalid constants root", () => {
    const rootDir = createFixtureProject({
      constantsSource: "- bad\n",
    });
    createdDirs.push(rootDir);

    expect(() =>
      generateFrontendEntrySource({
        cwd: rootDir,
        dirs: ["components"],
        setup: "setup.js",
        command: "build",
        errorPrefix: "[Watch]",
      }),
    ).toThrow("[Watch]");
  });

  it("uses provided error prefix for contract validation failures", () => {
    const rootDir = createFixtureProject({
      includeSchema: false,
    });
    createdDirs.push(rootDir);

    expect(() =>
      generateFrontendEntrySource({
        cwd: rootDir,
        dirs: ["components"],
        setup: "setup.js",
        command: "build",
        errorPrefix: "[Watch]",
      }),
    ).toThrow("[Watch] Component contract validation failed:");
  });
});
