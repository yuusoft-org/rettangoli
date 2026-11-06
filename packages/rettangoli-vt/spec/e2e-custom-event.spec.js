import http from "node:http";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSteps } from "../src/createSteps.js";

// In a real browser: customEvent detail values containing "=" reach the page
// intact (still strings), and a relative goto resolves against the current page.

const describeE2E = process.env.VT_E2E === "1" ? describe.sequential : describe.skip;

describeE2E("customEvent detail and relative goto in a real browser", () => {
  let browser;
  let server;
  let origin;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!doctype html><html><body><p id="path">${req.url}</p></body></html>`);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  it("delivers detail values containing '=' intact", async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${origin}/start.html`);
      await page.evaluate(() => {
        window.got = [];
        window.addEventListener("probe", (event) => window.got.push(event.detail));
      });
      const steps = createSteps(page, {});
      await steps.executeStep({
        action: "customEvent",
        name: "probe",
        detail: {
          query: "a=b&c=d",
          path: "/project?id=abc&tab=2",
          token: "YWJj==",
          "a=b": "c",
          deltaMS: 0,
          nested: { lineId: "x=y" },
        },
      });
      await steps.executeStep({ "customEvent probe a=b=c": [] });
      expect(await page.evaluate(() => window.got)).toEqual([
        {
          query: "a=b&c=d",
          path: "/project?id=abc&tab=2",
          token: "YWJj==",
          "a=b": "c",
          deltaMS: "0",
          nested: '{"lineId":"x=y"}',
        },
        { a: "b=c" },
      ]);
    } finally {
      await page.close();
    }
  }, 30000);

  it("resolves a relative goto against the current page", async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${origin}/candidate/a.html`);
      const steps = createSteps(page, {});
      await steps.executeStep({ action: "goto", url: "/next.html" });
      expect(page.url()).toBe(`${origin}/next.html`);
      await steps.executeStep({ action: "goto", url: "sub/page.html?x=1" });
      expect(page.url()).toBe(`${origin}/sub/page.html?x=1`);
      expect(await page.textContent("#path")).toBe("/sub/page.html?x=1");
    } finally {
      await page.close();
    }
  }, 30000);
});
