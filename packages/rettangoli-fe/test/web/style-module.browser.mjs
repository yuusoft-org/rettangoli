/**
 * Browser verification for the vendored snabbdom style module.
 *
 * Unit tests use stubs, which cannot prove the one thing that actually matters:
 * that in a real browser the vendored copy still resolves
 * `window.requestAnimationFrame` and applies styles identically to upstream.
 * A regression here would be invisible in Node and obvious in production.
 *
 *   node packages/rettangoli-fe/test/web/style-module.browser.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";

/**
 * Playwright is deliberately NOT a dependency of this package — it would add
 * ~150 MB of browsers to every install for a check that runs on demand. It is
 * resolved from the workspace root instead, so give a useful message rather
 * than a bare MODULE_NOT_FOUND when it is absent.
 */
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "[browser] playwright is not installed.\n" +
      "          This check is optional and runs from the workspace root:\n" +
      "            bun install && npx playwright install chromium\n" +
      "          The unit suite (`bun run test`) covers everything except real-browser rAF resolution.",
  );
  process.exit(2);
}

const ROOT = path.resolve(import.meta.dirname, "../../../..");

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

// Serve the monorepo so the browser can load real ES modules from node_modules.
const serve = (port) =>
  new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent(req.url.split("?")[0]);
        if (urlPath === "/") {
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          res.end('<!doctype html><html><body><div id="host"></div></body></html>');
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

const main = async () => {
  const port = 3577;
  const server = await serve(port);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(async (base) => {
    const { init } = await import(`${base}/node_modules/snabbdom/build/init.js`);
    const { h } = await import(`${base}/node_modules/snabbdom/build/h.js`);
    const { styleModule } = await import(
      `${base}/packages/rettangoli-fe/src/web/vendor/snabbdomStyleModule.js`
    );

    const patch = init([styleModule]);
    const host = document.getElementById("host");

    // 1. plain declarations + a custom property
    const a = patch(host, h("div", { style: { display: "contents", "--tone": "7" } }));
    const elm = a.elm;
    const afterCreate = {
      display: elm.style.display,
      tone: elm.style.getPropertyValue("--tone"),
    };

    // 2. update: change one, remove another
    const b = patch(a, h("div", { style: { display: "block" } }));
    const afterUpdate = {
      display: b.elm.style.display,
      tone: b.elm.style.getPropertyValue("--tone"),
    };

    // 3. `delayed` must apply on a later frame, not synchronously
    const c = patch(b, h("div", { style: { delayed: { opacity: "0.5" } } }));
    const opacityImmediately = c.elm.style.opacity;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise((r) => requestAnimationFrame(r));
    const opacityAfterFrames = c.elm.style.opacity;

    return {
      afterCreate,
      afterUpdate,
      opacityImmediately,
      opacityAfterFrames,
      rafIsReal: typeof window.requestAnimationFrame === "function",
    };
  }, `http://127.0.0.1:${port}`);

  console.log("[browser] vendored style module\n");
  check("applies plain declarations", result.afterCreate.display === "contents",
    `display=${result.afterCreate.display}`);
  check("applies custom properties via setProperty", result.afterCreate.tone === "7",
    `--tone=${result.afterCreate.tone}`);
  check("updates changed declarations", result.afterUpdate.display === "block",
    `display=${result.afterUpdate.display}`);
  check("removes declarations that disappeared", result.afterUpdate.tone === "",
    `--tone=${JSON.stringify(result.afterUpdate.tone)}`);
  check("does not apply `delayed` synchronously", result.opacityImmediately === "",
    `opacity=${JSON.stringify(result.opacityImmediately)}`);
  check("applies `delayed` on a later frame — proves rAF resolved",
    result.opacityAfterFrames === "0.5", `opacity=${result.opacityAfterFrames}`);
  check("browser really has requestAnimationFrame", result.rafIsReal);
  check("no page errors", errors.length === 0, errors[0] ?? "");

  await browser.close();
  server.close();

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n[browser] ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
};

main().catch((error) => {
  console.error("[browser] error:", error);
  process.exit(1);
});
