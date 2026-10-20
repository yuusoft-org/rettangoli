import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import vm from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

import buildSvgIcons from "../src/cli/buildSvg.js";

const CIRCLE = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';
// Backticks and ${ broke the template literals the generator used to write.
const TRICKY = '<svg viewBox="0 0 10 10"><title>`${x}`</title></svg>';

let workDir;

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// Builds an icons file from the given SVG files and returns its source.
const buildIconsFile = (files) => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  workDir = mkdtempSync(path.join(tmpdir(), "rtgl-build-svg-"));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(workDir, `${name}.svg`), content);
  }
  const outfile = path.join(workDir, "rtgl-icons.js");
  buildSvgIcons({ dir: workDir, outfile });
  return readFileSync(outfile, "utf8");
};

const runInPage = (source, window) => {
  vm.runInNewContext(source, { window });
  return window;
};

describe("rtgl ui build-svg", () => {
  it("registers the icons with rtgl.setIcons when Rettangoli UI has loaded", () => {
    const source = buildIconsFile({
      circle: `title: Circle\n---\n${CIRCLE}`,
      tricky: TRICKY,
    });
    const setIcons = vi.fn();

    const window = runInPage(source, { rtgl: { setIcons } });

    expect(setIcons).toHaveBeenCalledWith({ circle: CIRCLE, tricky: TRICKY });
    expect(window.rtglIcons).toBeUndefined();
  });

  it("falls back to window.rtglIcons when it runs before Rettangoli UI", () => {
    const source = buildIconsFile({ circle: CIRCLE });

    const window = runInPage(source, { rtglIcons: { existing: "<svg/>" } });

    expect(window.rtglIcons).toEqual({ existing: "<svg/>", circle: CIRCLE });
  });
});
