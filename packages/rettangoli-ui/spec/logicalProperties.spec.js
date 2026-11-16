import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Component styles must use logical properties (`margin-inline-start`,
// `inset-inline-end`, `text-align: start`) so they mirror under `dir="rtl"`.
// A physical declaration is only allowed where it is listed here with the
// reason it does not mirror.
const ALLOWED = [
  // The submenu arrow is drawn from two borders and has its own
  // `:dir(rtl)` rule next to it.
  { file: "components/dropdown-menu/dropdown-menu.view.yaml", pattern: /border-right|margin-(left|right)/ },
  // Numbers read left to right, but line up with the start edge of an RTL page.
  { file: "primitives/input.js", pattern: /text-align: right/ },
  { file: "primitives/input-number.js", pattern: /text-align: right/ },
];

const PHYSICAL = /\b(?:margin|padding)-(?:left|right)\s*:|\bborder-(?:left|right)(?:-(?:width|color|style))?\s*:|\btext-align:\s*(?:left|right)\b|\bfloat:\s*(?:left|right)\b/;

const sourceRoot = path.resolve(import.meta.dirname, "../src");

const listFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const filePath = path.join(dir, name);
  if (statSync(filePath).isDirectory()) {
    return listFiles(filePath);
  }
  return /\.(js|yaml|css)$/.test(name) ? [filePath] : [];
});

describe("UI source styles", () => {
  it("use logical properties instead of physical left/right", () => {
    const violations = [];

    for (const filePath of listFiles(sourceRoot)) {
      const file = path.relative(sourceRoot, filePath).split(path.sep).join("/");
      readFileSync(filePath, "utf8").split("\n").forEach((line, index) => {
        if (!PHYSICAL.test(line)) {
          return;
        }
        const allowed = ALLOWED.some((entry) => entry.file === file && entry.pattern.test(line));
        if (!allowed) {
          violations.push(`${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
