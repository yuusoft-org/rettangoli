// Shared setup for new spec/*.browser.mjs files (the nine older ones are
// self-contained): bundle src in memory, run in Chromium and WebKit, and
// collect page errors.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium, webkit } from "playwright";

export const uiDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

// Bundles `source` (entry code that can import from ./src) into one IIFE
// string that a page can run with addScriptTag({ content }).
export const bundle = async (source) => {
  const { outputFiles } = await build({
    stdin: { contents: source, resolveDir: uiDir },
    bundle: true,
    format: "iife",
    write: false,
  });
  return outputFiles[0].text;
};

// Runs `fn({ name, browser })` once per engine and always closes the browser.
export const forEachEngine = async (fn) => {
  for (const [name, engine] of Object.entries({ chromium, webkit })) {
    const browser = await engine.launch({ headless: true });
    try {
      await fn({ name, browser });
    } finally {
      await browser.close();
    }
  }
};

const readTheme = (file) => readFile(path.join(uiDir, "src/themes", file), "utf8");

// A page with the base and slate theme CSS applied, ready for a bundle.
export const newThemedPage = async (
  browser,
  { viewport = { width: 900, height: 600 }, ...options } = {},
) => {
  const page = await browser.newPage({ viewport, ...options });
  await page.setContent(
    '<meta name="viewport" content="width=device-width,initial-scale=1"><body class="light"></body>',
  );
  await page.addStyleTag({
    content:
      (await readTheme("base.css")) + (await readTheme("theme-rtgl-slate.css")),
  });
  return page;
};

// Returns a live array that collects uncaught page errors and console errors.
export const collectPageErrors = (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
};
