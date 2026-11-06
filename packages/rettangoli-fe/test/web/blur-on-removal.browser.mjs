/**
 * Browser verification for a render requested during the component's own patch.
 *
 * When a patch removes or moves the focused element, the browser can fire
 * blur and focusout while the patch is still running. Apps hide tooltips and
 * cancel seeks from those handlers with a store update and render(), so that
 * render() happens inside the patch that caused it. jsdom fires neither on
 * removal, so this runs in Chromium and WebKit: a fixture app is built with
 * `rtgl fe build` and driven in each browser.
 *
 * Chromium is required: it is the engine where the re-entrant path is known
 * to run. WebKit is skipped, with a line saying so, when it is not installed.
 *
 *   node packages/rettangoli-fe/test/web/blur-on-removal.browser.mjs
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

let playwright;
try {
  playwright = await import("playwright");
} catch {
  console.error(
    "[browser] playwright is not installed.\n" +
      "          This check is optional and runs from the workspace root:\n" +
      "            bun install && npx playwright install chromium webkit",
  );
  process.exit(2);
}

const { default: build } = await import("../../src/cli/build.js");

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "../..");

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const writeFiles = (rootDir, files) => {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDir, relativePath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
};

// x-editor: leaving edit mode removes the focused input. The input's own blur
// listener is gone by then (the patch drops a removed element's listeners
// first), but focusout bubbles to div#root, whose handler updates the store
// and renders.
// x-tips: a keyed list of buttons. Moving the focused one to the end fires
// its blur, whose action hides the tooltip; the action renders.
const createFixture = () => {
  const tempParent = path.join(PACKAGE_ROOT, ".tmp-tests");
  mkdirSync(tempParent, { recursive: true });
  const rootDir = mkdtempSync(path.join(tempParent, "rtgl-fe-blur-"));
  writeFiles(rootDir, {
    "setup.js": "export const deps = { components: {}, pages: {} };\n",
    "components/editor/editor.schema.yaml": [
      "componentName: x-editor",
      "propsSchema:",
      "  type: object",
      "  properties: {}",
    ].join("\n"),
    "components/editor/editor.view.yaml": [
      "refs:",
      "  root:",
      "    eventListeners:",
      "      focusout:",
      "        handler: handleFocusOut",
      "  editInput:",
      "    eventListeners:",
      "      blur:",
      "        handler: handleBlur",
      "template:",
      "  - div#root:",
      "      - $if editing:",
      "          - input#editInput: null",
      "      - $if !editing:",
      "          - span#label: ${label}",
      "      - span#blurs: ${blurs}",
      "      - span#focusouts: ${focusouts}",
    ].join("\n"),
    "components/editor/editor.store.js": [
      "export const createInitialState = () => ({ editing: true, label: 'idle', blurs: 0, focusouts: 0 });",
      "export const selectViewData = ({ state }) => ({ ...state });",
      "export const stopEditing = ({ state }) => { state.editing = false; };",
      "export const recordBlur = ({ state }) => { state.blurs += 1; };",
      "export const recordFocusOut = ({ state }) => { state.focusouts += 1; state.label = 'saved'; };",
    ].join("\n"),
    "components/editor/editor.handlers.js": [
      "export const handleBlur = (deps) => {",
      "  deps.store.recordBlur();",
      "  deps.render();",
      "};",
      "export const handleFocusOut = (deps) => {",
      "  deps.store.recordFocusOut();",
      "  deps.render();",
      "};",
    ].join("\n"),
    "components/tips/tips.schema.yaml": [
      "componentName: x-tips",
      "propsSchema:",
      "  type: object",
      "  properties: {}",
    ].join("\n"),
    "components/tips/tips.view.yaml": [
      "refs:",
      "  tip*:",
      "    eventListeners:",
      "      blur:",
      "        action: hideTooltip",
      "template:",
      "  - ul#list:",
      "      - $for item in items:",
      "          - li#row${item.id}:",
      "              - button#tip${item.id}: ${item.label}",
      "  - $if tooltip:",
      "      - p#tooltip: ${tooltip}",
    ].join("\n"),
    "components/tips/tips.store.js": [
      "export const createInitialState = () => ({",
      "  items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],",
      "  tooltip: 'about B',",
      "});",
      "export const selectViewData = ({ state }) => ({ ...state });",
      "export const moveToEnd = ({ state }, { id }) => {",
      "  state.items = [...state.items.filter((item) => item.id !== id), ...state.items.filter((item) => item.id === id)];",
      "};",
      "export const hideTooltip = ({ state }) => { state.tooltip = ''; };",
    ].join("\n"),
  });
  return rootDir;
};

const serve = (routes) =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const route = routes[req.url.split("?")[0]];
      if (!route) return res.writeHead(404).end("not found");
      res.writeHead(200, { "content-type": route.type });
      res.end(route.body);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });

// One render target, holding exactly the tree the final state renders.
const describeTree = (host) => {
  const targets = [...host.shadowRoot.children]
    .filter((node) => node.hasAttribute("data-rtgl-render-target"));
  return {
    targets: targets.length,
    html: targets.map((target) => target.innerHTML).join(""),
    state: host.store.getState(),
  };
};

const runBrowser = async (browserType, url) => {
  const browser = await browserType.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(url);
    await page.waitForFunction(() =>
      document.querySelector("x-editor")?.shadowRoot?.querySelector("#editInput")
        && document.querySelector("x-tips")?.shadowRoot?.querySelector("#tipb"));

    // Focus through Playwright, so the page itself has focus.
    await page.locator("x-editor #editInput").focus();
    const editor = await page.evaluate((describe) => {
      const read = new Function(`return (${describe})`)();
      const host = document.querySelector("x-editor");
      const focused = host.shadowRoot.activeElement?.id;
      host.store.stopEditing();
      host.render();
      return { focused, ...read(host) };
    }, describeTree.toString());

    await page.locator("x-tips #tipb").focus();
    const tips = await page.evaluate((describe) => {
      const read = new Function(`return (${describe})`)();
      const host = document.querySelector("x-tips");
      const focused = host.shadowRoot.activeElement?.id;
      host.store.moveToEnd({ id: "b" });
      host.render();
      return { focused, ...read(host) };
    }, describeTree.toString());

    // Later frames must not change anything or throw.
    await page.evaluate(() => new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const settled = await page.evaluate((describe) => {
      const read = new Function(`return (${describe})`)();
      return {
        editor: read(document.querySelector("x-editor")).html,
        tips: read(document.querySelector("x-tips")).html,
      };
    }, describeTree.toString());

    return { editor, tips, settled, errors };
  } finally {
    await browser.close();
  }
};

const main = async () => {
  const rootDir = createFixture();
  try {
    await build({ cwd: rootDir, dirs: ["components"], setup: "setup.js", outfile: "dist/main.js" });
    const page = '<!doctype html><html><head><meta charset="utf-8"></head><body><x-editor></x-editor><x-tips></x-tips><script type="module" src="/main.js"></script></body></html>';
    const server = await serve({
      "/": { type: "text/html; charset=utf-8", body: page },
      "/main.js": {
        type: "text/javascript; charset=utf-8",
        body: readFileSync(path.join(rootDir, "dist/main.js")),
      },
    });
    const url = `http://127.0.0.1:${server.address().port}/`;
    try {
      for (const name of ["chromium", "webkit"]) {
        if (name === "webkit" && !existsSync(playwright.webkit.executablePath())) {
          console.log("[browser] webkit: not installed, skipped (npx playwright install webkit)\n");
          continue;
        }
        console.log(`[browser] ${name}: blur and focusout fired by the component's own patch\n`);
        const result = await runBrowser(playwright[name], url);
        const { editor, tips } = result;

        // Whether a browser fires these events on removal or move differs;
        // the final DOM must match the final state either way.
        const { blurs, focusouts, label } = editor.state;
        check(`${name}: the focused input was focused`, editor.focused === "editInput");
        check(`${name}: the removed input's own blur listener did not run`, blurs === 0, `blurs=${blurs}`);
        check(`${name}: focusout ran at most once`, focusouts <= 1, `focusouts=${focusouts}`);
        check(`${name}: editor keeps one render target`, editor.targets === 1, `${editor.targets}`);
        check(`${name}: editor DOM matches its final state`,
          editor.html === `<div id="root"><span id="label">${label}</span><span id="blurs">0</span><span id="focusouts">${focusouts}</span></div>`,
          editor.html);

        const { tooltip } = tips.state;
        check(`${name}: the focused button was focused`, tips.focused === "tipb");
        check(`${name}: tips keeps one render target`, tips.targets === 1, `${tips.targets}`);
        check(`${name}: tips DOM matches its final state`,
          tips.html === `<ul id="list"><li id="rowa"><button id="tipa">A</button></li><li id="rowc"><button id="tipc">C</button></li><li id="rowb"><button id="tipb">B</button></li></ul>${tooltip ? `<p id="tooltip">${tooltip}</p>` : ""}`,
          tips.html);

        if (name === "chromium") {
          check("chromium: focusout fired during the removing patch, so the re-entrant path ran",
            focusouts === 1 && label === "saved");
          check("chromium: blur fired during the moving patch, so the re-entrant path ran",
            tooltip === "");
        }
        check(`${name}: later frames change nothing`,
          result.settled.editor === editor.html && result.settled.tips === tips.html);
        check(`${name}: no page errors`, result.errors.length === 0, result.errors[0] ?? "");
        console.log("");
      }
    } finally {
      server.close();
    }
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(`[browser] ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
};

await main();
