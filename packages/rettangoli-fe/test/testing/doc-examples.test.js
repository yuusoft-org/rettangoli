/**
 * Keeps the examples in the docs true.
 *
 * The component and the tests shown in `docs/testing.md` and in the site
 * guide are real files in `fixtures/todoList/`. Vitest runs the test files
 * there like any other test, so the examples are executed as written. This
 * file checks the other half: that each document shows every one of those
 * files exactly, so an edit to one side fails until the other follows.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const packageDirectory = path.resolve(import.meta.dirname, "../..");
const fixtureDirectory = path.join(import.meta.dirname, "fixtures/todoList");
const fixtureFiles = readdirSync(fixtureDirectory).sort();

const documents = [
  path.join(packageDirectory, "docs/testing.md"),
  // Part of the monorepo, not of the published package.
  path.join(packageDirectory, "../../apps/rettangoli.dev/pages/fe/docs/guides/testing.md"),
];

const codeBlocks = (markdown) =>
  [...markdown.matchAll(/^```[a-z]*\n([\s\S]*?)\n```$/gm)].map((match) => match[1]);

describe("doc examples", () => {
  it("has the component files and one test per kind of example", () => {
    expect(fixtureFiles).toEqual([
      "todoList.component.test.js",
      "todoList.handlers.js",
      "todoList.handlers.test.js",
      "todoList.schema.yaml",
      "todoList.store.js",
      "todoList.store.test.js",
      "todoList.tree.test.js",
      "todoList.view.test.js",
      "todoList.view.yaml",
    ]);
  });

  describe.each(documents)("%s", (documentPath) => {
    it("exists", () => {
      expect(existsSync(documentPath)).toBe(true);
    });

    it.each(fixtureFiles)("shows %s exactly, under its file name", (fileName) => {
      const markdown = readFileSync(documentPath, "utf8");
      const source = readFileSync(path.join(fixtureDirectory, fileName), "utf8").trimEnd();
      expect(codeBlocks(markdown)).toContain(source);
      expect(markdown).toContain(`\`${fileName}\`\n\n\`\`\``);
    });
  });
});
