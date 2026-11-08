import { describe, expect, it } from "vitest";
import { createSteps } from "../../src/createSteps.js";

// `goto` handed relative URLs straight to page.goto, which rejects them ("Cannot navigate to
// invalid URL"), although the docs show relative URLs. They now resolve against the current page
// when it is an http(s) or file page; anything that parses as a URL is passed through unchanged.

function createPage(currentUrl) {
  const gotos = [];
  return {
    gotos,
    url: () => currentUrl,
    async goto(url, options) {
      gotos.push([url, options]);
    },
    async addStyleTag() {},
  };
}

async function gotoFrom(currentUrl, url) {
  const page = createPage(currentUrl);
  await createSteps(page, {}).executeStep({ action: "goto", url });
  return page.gotos[0][0];
}

const PAGE = "http://localhost:3001/candidate/a.html";

describe("relative goto", () => {
  it.each([
    ["/b.html", "http://localhost:3001/b.html"],
    ["c.html", "http://localhost:3001/candidate/c.html"],
    ["../d.html?x=1", "http://localhost:3001/d.html?x=1"],
    ["//example.com/x", "http://example.com/x"],
  ])("%s from an http page navigates to %s", async (url, expected) => {
    expect(await gotoFrom(PAGE, url)).toBe(expected);
  });

  it("resolves against a file page", async () => {
    expect(await gotoFrom("file:///tmp/site/a.html", "b.html")).toBe("file:///tmp/site/b.html");
  });
});

describe("unchanged goto behavior", () => {
  it.each([
    "https://example.com/a?b=1#c",
    "http://localhost:3001/other.html",
    "about:blank",
    "file:///tmp/page.html",
    "localhost:3000/app",
    "127.0.0.1:8080/app",
    "localhost/app",
  ])("%s is passed through as the same string", async (url) => {
    expect(await gotoFrom(PAGE, url)).toBe(url);
  });

  it("a relative URL on a non-http page is passed raw", async () => {
    expect(await gotoFrom("about:blank", "/b.html")).toBe("/b.html");
  });

  it("a relative URL on a Chromium error page is passed raw", async () => {
    expect(await gotoFrom("chrome-error://chromewebdata/", "/b.html")).toBe("/b.html");
  });

  it("keeps waitUntil networkidle", async () => {
    const page = createPage(PAGE);
    await createSteps(page, {}).executeStep({ action: "goto", url: "/b.html" });
    expect(page.gotos[0][1]).toEqual({ waitUntil: "networkidle" });
  });
});
