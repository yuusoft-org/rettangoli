import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import accept from "../../src/cli/accept.js";
import { createTempProject, inProjectDir, writeProjectFile } from "../support/temp-project.js";

// accept() called process.exit(1) on errors, so programmatic callers could not catch the
// failure and their finally blocks never ran. It now throws (after printing the same one-line
// message), and items whose candidate disappeared are reported instead of skipped silently.

function writeReport(root, items) {
  writeProjectFile(root, ".rettangoli/vt/report.json", JSON.stringify({ items }));
}

describe.sequential("accept throws instead of exiting", () => {
  let project = null;
  let errors;
  let warnings;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-accept-errors-" });
    vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${code}) called`);
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    errors = vi.spyOn(console, "error").mockImplementation(() => {});
    warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  it("rejects when report.json is missing", async () => {
    await expect(inProjectDir(project.root, () => accept({}))).rejects.toThrow(
      'report.json not found. Run "rtgl vt report" first.',
    );
    expect(process.exit).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalledWith('Error: report.json not found. Run "rtgl vt report" first.');
  });

  it("rejects with the original error when removing a reference fails", async () => {
    const { root } = project;
    // A directory where the reference file should be: rm() without `recursive` fails.
    mkdirSync(join(root, "vt/reference/pages/gone-01.webp"), { recursive: true });
    writeReport(root, [{
      path: "reference/pages/gone-01.webp",
      candidatePath: null,
      referencePath: "reference/pages/gone-01.webp",
      onlyInCandidate: false,
      onlyInReference: true,
    }]);

    const error = await inProjectDir(root, () => accept({})).then(() => null, (caught) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).not.toContain("process.exit");
    expect(process.exit).not.toHaveBeenCalled();
    expect(errors).toHaveBeenCalledWith("Error:", error.message);
  });

  it("warns about items whose candidate no longer exists and resolves", async () => {
    const { root } = project;
    writeProjectFile(root, ".rettangoli/vt/_site/candidate/pages/kept-01.webp", "kept");
    writeReport(root, [
      {
        path: "candidate/pages/missing-01.webp",
        candidatePath: "candidate/pages/missing-01.webp",
        referencePath: null,
        onlyInCandidate: true,
        onlyInReference: false,
      },
      {
        path: "candidate/pages/kept-01.webp",
        candidatePath: "candidate/pages/kept-01.webp",
        referencePath: null,
        onlyInCandidate: true,
        onlyInReference: false,
      },
    ]);

    await expect(inProjectDir(root, () => accept({}))).resolves.toBeUndefined();
    expect(existsSync(join(root, "vt/reference/pages/kept-01.webp"))).toBe(true);
    expect(existsSync(join(root, "vt/reference/pages/missing-01.webp"))).toBe(false);
    expect(warnings).toHaveBeenCalledWith(
      'Skipped 1 item(s) whose candidate no longer exists; re-run "rtgl vt report".',
    );
    expect(console.log).toHaveBeenCalledWith("Done! Changes accepted.");
  });

  it("does not warn when every candidate exists", async () => {
    const { root } = project;
    writeProjectFile(root, ".rettangoli/vt/_site/candidate/pages/kept-01.webp", "kept");
    writeReport(root, [{
      path: "candidate/pages/kept-01.webp",
      candidatePath: "candidate/pages/kept-01.webp",
      referencePath: "reference/pages/kept-01.webp",
      onlyInCandidate: false,
      onlyInReference: false,
    }]);
    await expect(inProjectDir(root, () => accept({}))).resolves.toBeUndefined();
    expect(warnings).not.toHaveBeenCalled();
  });
});
