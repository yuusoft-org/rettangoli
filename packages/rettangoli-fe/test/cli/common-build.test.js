import path from "node:path";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { findDuplicateComponentIds, getAllFiles } from "../../src/commonBuild.js";

const tempDirs = [];

afterEach(() => {
  tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }));
});

// realpath, so the macOS /var -> /private/var link does not show up in results.
const createRoot = (files = {}) => {
  const rootDir = realpathSync(mkdtempSync(path.join(tmpdir(), "rtgl-fe-common-build-")));
  tempDirs.push(rootDir);
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDir, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
  return rootDir;
};

const HELLO = {
  "c/hello/hello.schema.yaml": "componentName: x-hello\n",
  "c/hello/hello.view.yaml": "template: []\n",
};

const relativeFiles = (rootDir, dirs) =>
  getAllFiles(dirs.map((dir) => path.join(rootDir, dir))).map((filePath) => path.relative(rootDir, filePath));

describe("getAllFiles", () => {
  it("lists files in readdir order, depth first, keeping dot files", () => {
    const rootDir = createRoot({
      ...HELLO,
      "c/hello/.hello.view.yaml.swp": "",
      "c/.hidden/x.view.yaml": "",
      "c/a.txt": "",
    });
    expect(relativeFiles(rootDir, ["c"])).toEqual([
      "c/.hidden/x.view.yaml",
      "c/a.txt",
      "c/hello/.hello.view.yaml.swp",
      "c/hello/hello.schema.yaml",
      "c/hello/hello.view.yaml",
    ].map((file) => file.split("/").join(path.sep)));
  });

  it("skips a dangling symlink, such as an editor lock file", () => {
    const rootDir = createRoot(HELLO);
    symlinkSync("me@host.1234:1700000000", path.join(rootDir, "c/hello/.#hello.view.yaml"));
    symlinkSync("gone.png", path.join(rootDir, "c/hello/icon.png"));
    expect(relativeFiles(rootDir, ["c"])).toEqual([
      path.join("c/hello/hello.schema.yaml"),
      path.join("c/hello/hello.view.yaml"),
    ]);
  });

  it("skips a symlink back to a directory it is already inside", () => {
    const rootDir = createRoot(HELLO);
    symlinkSync("..", path.join(rootDir, "c/hello/loop"));
    symlinkSync(".", path.join(rootDir, "c/self"));
    expect(relativeFiles(rootDir, ["c"])).toEqual([
      path.join("c/hello/hello.schema.yaml"),
      path.join("c/hello/hello.view.yaml"),
    ]);
  });

  it("follows a symlinked directory", () => {
    const rootDir = createRoot({ ...HELLO, "shared/widget/widget.view.yaml": "template: []\n" });
    symlinkSync(path.join(rootDir, "shared"), path.join(rootDir, "c/linked"));
    expect(relativeFiles(rootDir, ["c"])).toEqual([
      path.join("c/hello/hello.schema.yaml"),
      path.join("c/hello/hello.view.yaml"),
      path.join("c/linked/widget/widget.view.yaml"),
    ]);
  });

  it("lists a directory reached through two names twice", () => {
    const rootDir = createRoot(HELLO);
    symlinkSync("hello", path.join(rootDir, "c/alias"));
    expect(relativeFiles(rootDir, ["c"])).toEqual([
      path.join("c/alias/hello.schema.yaml"),
      path.join("c/alias/hello.view.yaml"),
      path.join("c/hello/hello.schema.yaml"),
      path.join("c/hello/hello.view.yaml"),
    ]);
  });

  it("walks overlapping and repeated roots once per root", () => {
    const rootDir = createRoot(HELLO);
    expect(relativeFiles(rootDir, ["c", "c/hello", "c"])).toEqual([
      path.join("c/hello/hello.schema.yaml"),
      path.join("c/hello/hello.view.yaml"),
      path.join("c/hello/hello.schema.yaml"),
      path.join("c/hello/hello.view.yaml"),
      path.join("c/hello/hello.schema.yaml"),
      path.join("c/hello/hello.view.yaml"),
    ]);
  });

  it("still throws for a missing root", () => {
    const rootDir = createRoot();
    const missing = path.join(rootDir, "nope");
    expect(() => getAllFiles([missing])).toThrow(`ENOENT: no such file or directory, scandir '${missing}'`);
  });
});

describe("findDuplicateComponentIds", () => {
  it("returns each id that two folders define, naming both", () => {
    const files = [
      "/app/src/components/a/item.schema.yaml",
      "/app/src/components/a/item.view.yaml",
      "/app/src/components/b/item.view.yaml",
      "/app/src/components/card/card.view.yaml",
      "/app/vendor/components/card/card.view.yaml",
      "/app/src/pages/home/home.view.yaml",
    ].map((file) => file.split("/").join(path.sep));
    const owner = (file) => file.split("/").join(path.sep);
    expect(findDuplicateComponentIds(files)).toEqual([
      { id: "components/item", owners: [owner("/app/src/components/a/item"), owner("/app/src/components/b/item")] },
      { id: "components/card", owners: [owner("/app/src/components/card/card"), owner("/app/vendor/components/card/card")] },
    ]);
  });

  it("does not count a file listed twice by overlapping roots", () => {
    const files = [
      "/app/src/components/card/card.view.yaml",
      "/app/src/components/card/card.schema.yaml",
      "/app/src/components/card/card.view.yaml",
    ].map((file) => file.split("/").join(path.sep));
    expect(findDuplicateComponentIds(files)).toEqual([]);
  });
});
