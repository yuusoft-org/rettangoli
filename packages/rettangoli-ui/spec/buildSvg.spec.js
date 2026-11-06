import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
// Names may contain "/" to put a file in a subdirectory.
const buildIconsFile = (files) => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  workDir = mkdtempSync(path.join(tmpdir(), "rtgl-build-svg-"));
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(workDir, `${name}.svg`);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
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

  it("creates window.rtglIcons when it runs first on a page", () => {
    const source = buildIconsFile({ circle: CIRCLE });

    const window = runInPage(source, {});

    expect(window.rtglIcons).toEqual({ circle: CIRCLE });
  });

  it("falls back to window.rtglIcons when it runs before Rettangoli UI", () => {
    const source = buildIconsFile({ circle: CIRCLE });

    const window = runInPage(source, { rtglIcons: { existing: "<svg/>" } });

    expect(window.rtglIcons).toEqual({ existing: "<svg/>", circle: CIRCLE });
  });
});

describe("rtgl ui build-svg frontmatter and names", () => {
  const buildIcons = (files) => {
    const window = runInPage(buildIconsFile(files), {});
    return window.rtglIcons;
  };

  it("strips a frontmatter block that opens and closes with ---", () => {
    expect(
      buildIcons({
        circle: `---\nname: Circle\ntags: shape\n---\n${CIRCLE}\n`,
        padded: `\n  \n---\nname: Padded\n---\n${CIRCLE}`,
      }),
    ).toEqual({ circle: CIRCLE, padded: CIRCLE });
  });

  it("keeps the legacy format, where metadata ends at the first --- line", () => {
    expect(buildIcons({ circle: `name: Circle\n---\n${CIRCLE}` })).toEqual({
      circle: CIRCLE,
    });
  });

  it("drops only the opening --- when it is never closed", () => {
    expect(buildIcons({ circle: `---\n${CIRCLE}` })).toEqual({ circle: CIRCLE });
  });

  it("keeps a file with no --- line, collapsing its whitespace", () => {
    expect(
      buildIcons({ circle: '<svg viewBox="0 0 10 10">\n  <circle cx="5" cy="5" r="4"/>\n</svg>\n' }),
    ).toEqual({ circle: '<svg viewBox="0 0 10 10"> <circle cx="5" cy="5" r="4"/> </svg>' });
  });

  it("warns about icons with the same name, and the file read last wins", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const first = '<svg id="a"/>';
    const second = '<svg id="b"/>';

    const icons = buildIcons({ "a/dup": first, "b/dup": second, other: CIRCLE });

    expect(warn).toHaveBeenCalledTimes(1);
    const [message] = warn.mock.calls[0];
    const pathA = path.join(workDir, "a", "dup.svg");
    const pathB = path.join(workDir, "b", "dup.svg");
    expect(message).toContain('"dup"');
    expect(message).toContain(pathA);
    expect(message).toContain(pathB);
    // The message names the file that replaced the other one first.
    const winner = message.indexOf(pathA) < message.indexOf(pathB) ? first : second;
    expect(icons).toEqual({ dup: winner, other: CIRCLE });
  });
});
