/**
 * Browser verification for hydration.
 *
 * The unit suite attaches shadow roots by hand, because jsdom does not parse
 * declarative shadow DOM. This check runs the whole path for real: a fixture
 * app is built with `rtgl fe build`, rendered with `@rettangoli/fe/server`,
 * parsed by Chromium, and then adopted by the bundle.
 *
 * Server nodes are recorded by a classic script that runs after the markup is
 * parsed and before the module bundle, so "adopted" is checked by node
 * identity, not by counting.
 *
 *   node packages/rettangoli-fe/test/web/hydration.browser.mjs
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "[browser] playwright is not installed.\n" +
      "          This check is optional and runs from the workspace root:\n" +
      "            bun install && npx playwright install chromium",
  );
  process.exit(2);
}

const { default: build } = await import("../../src/cli/build.js");
const { loadComponents, renderComponent } = await import("../../src/server/index.js");

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

// Components sort before pages, so by default the child would be defined
// first; the page has server markup, so the bundle must define the parent
// first instead.
const createFixture = () => {
  const tempParent = path.join(PACKAGE_ROOT, ".tmp-tests");
  mkdirSync(tempParent, { recursive: true });
  const rootDir = mkdtempSync(path.join(tempParent, "rtgl-fe-hydration-"));
  writeFiles(rootDir, {
    "setup.js": "export const deps = { components: {}, pages: {} };\n",
    "pages/shell/shell.schema.yaml": [
      "componentName: x-shell",
      "propsSchema:",
      "  type: object",
      "  properties:",
      "    title: {}",
      "    items: {}",
    ].join("\n"),
    "pages/shell/shell.view.yaml": [
      "refs:",
      "  more:",
      "    eventListeners:",
      "      click:",
      "        handler: handleMore",
      "template:",
      "  - main#page.page:",
      "      - h1: ${title}",
      "      - x-list :items=${items}: null",
      "      - button#more: More",
    ].join("\n"),
    "pages/shell/shell.store.js": [
      "export const createInitialState = ({ props }) => ({ items: props.items || [] });",
      "export const addItem = ({ state }) => { state.items = [...state.items, `item ${state.items.length + 1}`]; };",
      "export const selectViewData = ({ state, props }) => ({ title: props.title, items: state.items });",
    ].join("\n"),
    "pages/shell/shell.handlers.js": [
      "export const handleMore = (deps) => { deps.store.addItem(); deps.render(); };",
    ].join("\n"),
    "components/list/list.schema.yaml": [
      "componentName: x-list",
      "propsSchema:",
      "  type: object",
      "  properties:",
      "    items: {}",
    ].join("\n"),
    "components/list/list.view.yaml": [
      "template:",
      "  - ul:",
      "      - $for item, i in items:",
      "          - li#item${i}: ${item}",
    ].join("\n"),
    "components/list/list.store.js":
      "export const selectViewData = ({ props }) => ({ items: props.items || [] });\n",
  });
  return rootDir;
};

const recordServerNodes = `
<script>
  window.__serverNodes = [];
  const walk = (root) => {
    for (const element of root.querySelectorAll("*")) {
      window.__serverNodes.push(element);
      if (element.shadowRoot) walk(element.shadowRoot);
    }
  };
  walk(document);
</script>`;

const serve = (port, routes) =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      const route = routes[req.url.split("?")[0]];
      if (!route) return res.writeHead(404).end("not found");
      res.writeHead(200, { "content-type": route.type });
      res.end(route.body);
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });

const main = async () => {
  const rootDir = createFixture();
  const dirs = ["components", "pages"];
  try {
    await build({ cwd: rootDir, dirs, setup: "setup.js", outfile: "dist/main.js" });
    const components = await loadComponents({ cwd: rootDir, dirs });
    const { html } = renderComponent({
      component: "x-shell",
      components,
      props: { title: "Hello", items: ["item 1", "item 2"] },
      serializeProps: true,
    });
    const page = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}${recordServerNodes}<script type="module" src="/main.js"></script></body></html>`;

    const port = 3578;
    const server = await serve(port, {
      "/": { type: "text/html; charset=utf-8", body: page },
      "/main.js": {
        type: "text/javascript; charset=utf-8",
        body: readFileSync(path.join(rootDir, "dist/main.js")),
      },
    });
    const browser = await chromium.launch();
    try {
      console.log("[browser] hydration\n");

      const noScript = await browser.newContext({ javaScriptEnabled: false });
      const staticPage = await noScript.newPage();
      await staticPage.goto(`http://127.0.0.1:${port}/`);
      check("server markup paints with no JavaScript",
        (await staticPage.locator("h1").textContent()) === "Hello"
          && (await staticPage.locator("li").count()) === 2);
      await noScript.close();

      const context = await browser.newContext();
      const live = await context.newPage();
      const errors = [];
      live.on("pageerror", (error) => errors.push(String(error)));
      await live.goto(`http://127.0.0.1:${port}/`);
      await live.waitForFunction(() => globalThis.__rtglSsr?.hydrated >= 1);

      const result = await live.evaluate(() => {
        const shell = document.querySelector("x-shell");
        const list = shell.shadowRoot.querySelector("x-list");
        const serverNodes = new Set(window.__serverNodes);
        const live = [shell, ...shell.shadowRoot.querySelectorAll("*"), ...list.shadowRoot.querySelectorAll("*")];
        return {
          ssr: globalThis.__rtglSsr,
          adopted: live.filter((node) => serverNodes.has(node)).length,
          liveCount: live.length,
          renderTargets: shell.shadowRoot.querySelectorAll("[data-rtgl-render-target]").length
            + list.shadowRoot.querySelectorAll("[data-rtgl-render-target]").length,
          items: [...list.shadowRoot.querySelectorAll("li")].map((li) => li.textContent),
          propsScript: Boolean(shell.querySelector("script[data-rtgl-props]")),
          listProps: list.props.items,
        };
      });
      check("every component hydrated with no mismatch",
        result.ssr.hydrated === 2 && result.ssr.mismatched === 0,
        JSON.stringify(result.ssr));
      check("every live node is the node the server sent",
        result.adopted === result.liveCount, `${result.adopted}/${result.liveCount}`);
      check("one render target per component", result.renderTargets === 2,
        `${result.renderTargets}`);
      check("the child got its props from the parent's patch",
        JSON.stringify(result.listProps) === JSON.stringify(["item 1", "item 2"]));
      check("the serialized props script is gone", !result.propsScript);

      await live.locator("button").click();
      await live.waitForFunction(() =>
        document.querySelector("x-shell").shadowRoot.querySelector("x-list")
          .shadowRoot.querySelectorAll("li").length === 3);
      check("listeners are bound on the server's elements", true);
      check("no page errors", errors.length === 0, errors[0] ?? "");
    } finally {
      await browser.close();
      server.close();
    }
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n[browser] ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
};

await main();
