/**
 * Browser verification for component style sheets under
 * construct-style-sheets-polyfill 3.1.0, which production apps load for
 * browsers without constructable style sheets (WebKit before 16.4).
 *
 * Native adoptedStyleSheets is deleted before the polyfill loads, so the
 * polyfill emulates every adopted sheet with a <style> per shadow root.
 * A polyfilled sheet keeps every root that adopted it alive, so fe must not
 * share sheets here: each connect gets fresh sheets, the styles apply, a
 * reconnect and a hot update still work, and removed instances are garbage
 * collected.
 *
 *   node packages/rettangoli-fe/test/web/style-polyfill.browser.mjs
 */

import {
  checkComponentStyleResult,
  checkRemovedInstancesCollected,
  runComponentStyleScenario,
  serveComponentStylesPage,
} from "./componentStyles.mjs";

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

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const main = async () => {
  const port = 3578;
  const server = await serveComponentStylesPage({ port, polyfill: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });

  console.log("[browser] component style sheets (construct-style-sheets-polyfill)\n");
  checkComponentStyleResult(
    await runComponentStyleScenario(page, port),
    check,
    { polyfill: true },
  );
  await checkRemovedInstancesCollected(page, port, check);
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
