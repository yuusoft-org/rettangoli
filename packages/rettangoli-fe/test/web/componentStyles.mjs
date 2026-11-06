/**
 * Node-side half of the component style sheet checks, shared by
 * style-module.browser.mjs (native constructable style sheets) and
 * style-polyfill.browser.mjs (construct-style-sheets-polyfill 3.1.0, the
 * version production apps ship for browsers without them).
 *
 * The page loads fe straight from src: an import map resolves the bare
 * imports to the workspace node_modules.
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../../../..");
const PAGE_MODULE = "/packages/rettangoli-fe/test/web/componentStyles.page.js";
const POLYFILL = "/packages/rettangoli-fe/test/web/fixtures/construct-style-sheets-polyfill-3.1.0.js";

const IMPORT_MAP = {
  imports: {
    jempl: "/node_modules/jempl/src/index.js",
    "jempl/": "/node_modules/jempl/",
    "snabbdom/": "/node_modules/snabbdom/",
    immer: "/node_modules/immer/dist/immer.production.mjs",
  },
};

// Runs before any module: removes native adoptedStyleSheets the way an older
// WebKit lacks it, so the polyfill installs itself.
const REMOVE_NATIVE_SHEETS = `
  window.__nativeCSSStyleSheet = CSSStyleSheet;
  delete Document.prototype.adoptedStyleSheets;
  delete ShadowRoot.prototype.adoptedStyleSheets;
`;

const pageHtml = ({ polyfill }) => [
  "<!doctype html><html><head>",
  `<script type="importmap">${JSON.stringify(IMPORT_MAP)}</script>`,
  polyfill ? `<script>${REMOVE_NATIVE_SHEETS}</script>` : "",
  polyfill ? `<script src="${POLYFILL}"></script>` : "",
  '</head><body><div id="host"></div></body></html>',
].join("");

// Serves the page at / and the monorepo files as JavaScript.
export const serveComponentStylesPage = ({ port, polyfill = false }) =>
  new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent(req.url.split("?")[0]);
        if (urlPath === "/") {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end(pageHtml({ polyfill }));
          return;
        }
        const file = path.join(ROOT, urlPath);
        if (!file.startsWith(ROOT)) return res.writeHead(403).end();
        const body = await readFile(file);
        res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        res.end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    server.listen(port, () => resolve(server));
  });

const importPageModule = (page, port, run, arg) =>
  page.evaluate(async ({ base, modulePath, run: name, arg: value }) => {
    const pageModule = await import(`${base}${modulePath}`);
    return pageModule[name](value);
  }, { base: `http://127.0.0.1:${port}`, modulePath: PAGE_MODULE, run, arg });

export const runComponentStyleScenario = async (page, port) => ({
  ...(await importPageModule(page, port, "runComponentStyleScenario")),
  ...(await page.evaluate(() => ({
    nativeAdoptedStyleSheets: "adoptedStyleSheets" in document
      && window.__nativeCSSStyleSheet === undefined,
    polyfillInstalled: window.__nativeCSSStyleSheet !== undefined
      && "adoptedStyleSheets" in document
      && window.CSSStyleSheet !== window.__nativeCSSStyleSheet,
  }))),
});

export const checkComponentStyleResult = (result, check, { polyfill }) => {
  const { expected, initial, reconnected, hotUpdated, afterUpdate } = result;
  // The polyfill emulates each adopted sheet with a <style> in the root.
  const styleElements = polyfill ? 2 : 0;
  const allEqual = (values, value) => values.every((item) => item === value);
  // Native sheets are shared, one per CSS text. A polyfilled sheet keeps every
  // root that adopted it alive, so each connect gets fresh sheets instead.
  const sheetsFor = (count) => (polyfill ? count : 1);
  const sharing = polyfill ? "each instance has its own sheets" : "instances share the sheets";

  check(polyfill ? "the polyfill replaced native style sheets" : "the browser has native adoptedStyleSheets",
    polyfill ? result.polyfillInstalled : result.nativeAdoptedStyleSheets);
  check("three instances apply the component style",
    allEqual(initial.colors, expected.red), initial.colors.join(", "));
  check(sharing,
    initial.commonSheets === sheetsFor(3) && initial.componentSheets === sheetsFor(3),
    `common ${initial.commonSheets}, component ${initial.componentSheets}`);
  check("each shadow root has its own adoptedStyleSheets array", initial.distinctArrays);
  check("each root adopts two sheets", allEqual(initial.sheetCounts, 2),
    initial.sheetCounts.join(", "));
  check(`each root holds ${styleElements} <style> elements`,
    allEqual(initial.styleElements, styleElements), initial.styleElements.join(", "));
  check(polyfill
    ? "a reconnected instance keeps its style and gets a fresh sheet"
    : "a reconnected instance keeps its style and sheet",
  allEqual(reconnected.colors, expected.red) && reconnected.keepsSheet === !polyfill
      && reconnected.componentSheets === sheetsFor(3)
      && allEqual(reconnected.styleElements, styleElements),
  reconnected.colors.join(", "));
  check("a hot update restyles every live instance",
    hotUpdated.updatedInstances === 3 && allEqual(hotUpdated.colors, expected.blue),
    hotUpdated.colors.join(", "));
  check(`after a hot update the old sheet is dropped and ${sharing}`,
    hotUpdated.replacedSheet && hotUpdated.commonSheets === sheetsFor(3)
      && hotUpdated.componentSheets === sheetsFor(3)
      && allEqual(hotUpdated.sheetCounts, 2)
      && allEqual(hotUpdated.styleElements, styleElements),
    `<style> per root: ${hotUpdated.styleElements.join(", ")}`);
  check(`an instance created after the update is styled and ${sharing}`,
    allEqual(afterUpdate.colors, expected.blue)
      && afterUpdate.commonSheets === sheetsFor(4)
      && afterUpdate.componentSheets === sheetsFor(4) && afterUpdate.distinctArrays,
    afterUpdate.colors.join(", "));
};

// Run after runComponentStyleScenario (it defines x-styled). Connects and
// removes 100 instances, forces GC through CDP (Chromium only), and checks
// that none survive: a sheet that keeps its roots alive would keep them all.
export const checkRemovedInstancesCollected = async (page, port, check) => {
  const count = 100;
  const { styled } = await importPageModule(page, port, "connectAndRemoveInstances", count);
  const cdp = await page.context().newCDPSession(page);
  for (let i = 0; i < 4; i += 1) {
    await cdp.send("HeapProfiler.collectGarbage");
    await page.waitForTimeout(50);
  }
  await cdp.detach();
  const alive = await importPageModule(page, port, "countLiveRemovedInstances");
  check(`${count} removed instances were styled and are garbage collected`,
    styled && alive === 0, `${alive}/${count} alive after GC`);
};
