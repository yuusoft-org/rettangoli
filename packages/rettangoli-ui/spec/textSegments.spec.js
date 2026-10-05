import { describe, expect, it } from "vitest";

import {
  flattenTextSegments,
  isSafeHref,
  normalizeTextSegments,
  renderableTextSegments,
} from "../src/common/textSegments.js";

describe("normalizeTextSegments", () => {
  it("returns null for strings and other non-array values", () => {
    expect(normalizeTextSegments("plain text")).toBeNull();
    expect(normalizeTextSegments("")).toBeNull();
    expect(normalizeTextSegments(undefined)).toBeNull();
    expect(normalizeTextSegments(null)).toBeNull();
    expect(normalizeTextSegments(42)).toBeNull();
    expect(normalizeTextSegments({ text: "nope" })).toBeNull();
  });

  it("normalizes mixed string and object segments and ignores unknown keys", () => {
    expect(
      normalizeTextSegments([
        "Please read the ",
        { text: "terms", href: "/terms", newTab: true, unknown: "ignored" },
        " first.",
      ]),
    ).toEqual([
      { text: "Please read the " },
      { text: "terms", href: "/terms", target: "_blank", rel: "noopener noreferrer" },
      { text: " first." },
    ]);
  });

  it("drops invalid entries and empty-string text", () => {
    expect(
      normalizeTextSegments([
        "",
        42,
        null,
        undefined,
        [],
        {},
        { text: 42 },
        { text: "" },
        "kept",
        { noText: true },
      ]),
    ).toEqual([{ text: "kept" }]);
  });

  it("returns an empty array for an empty array", () => {
    expect(normalizeTextSegments([])).toEqual([]);
  });

  it("keeps newlines and whitespace inside segment text", () => {
    expect(
      normalizeTextSegments(["line one\n", { text: "line two\n", href: "/x" }, " "]),
    ).toEqual([
      { text: "line one\n" },
      { text: "line two\n", href: "/x" },
      { text: " " },
    ]);
  });
});

describe("href safety", () => {
  it.each([
    "https://example.com/terms",
    "http://example.com/terms",
    "HTTPS://EXAMPLE.COM/TERMS",
    "mailto:support@example.com",
    "/terms",
    "terms",
    "./terms",
    "../terms",
    "#section",
    "/terms?q=1#frag",
    "//example.com/terms",
  ])("accepts safe href %j", (href) => {
    expect(isSafeHref(href)).toBe(true);
    expect(normalizeTextSegments([{ text: "link", href }])).toEqual([
      expect.objectContaining({ text: "link", href }),
    ]);
  });

  it.each([
    "javascript:alert(1)",
    " javascript:alert(1)",
    "  javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "\u0001javascript:alert(1)",
    " javascript:alert(1) ",
    "\tjavascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "blob:https://example.com/123",
    "about:blank",
    "jAvascript\t:alert(1)",
  ])("rejects unsafe href %j and renders plain text", (href) => {
    expect(isSafeHref(href)).toBe(false);
    expect(normalizeTextSegments([{ text: "link", href }])).toEqual([
      { text: "link" },
    ]);
  });

  it("rejects non-string and empty hrefs", () => {
    expect(isSafeHref("")).toBe(false);
    expect(isSafeHref(undefined)).toBe(false);
    expect(isSafeHref(null)).toBe(false);
    expect(isSafeHref(123)).toBe(false);
    expect(normalizeTextSegments([{ text: "link", href: "" }])).toEqual([
      { text: "link" },
    ]);
  });
});

describe("newTab and rel normalization", () => {
  it("adds target=_blank and noopener noreferrer for newTab without rel", () => {
    expect(
      normalizeTextSegments([{ text: "docs", href: "https://example.com", newTab: true }]),
    ).toEqual([
      { text: "docs", href: "https://example.com", target: "_blank", rel: "noopener noreferrer" },
    ]);
  });

  it("keeps an explicit rel without newTab", () => {
    expect(
      normalizeTextSegments([{ text: "docs", href: "https://example.com", rel: "external" }]),
    ).toEqual([
      { text: "docs", href: "https://example.com", rel: "external" },
    ]);
  });

  it("keeps an explicit rel with newTab when it already has noopener", () => {
    expect(
      normalizeTextSegments([
        { text: "docs", href: "https://example.com", newTab: true, rel: "noopener" },
      ]),
    ).toEqual([
      { text: "docs", href: "https://example.com", target: "_blank", rel: "noopener" },
    ]);
  });

  it("guarantees noopener when newTab rel lacks it", () => {
    expect(
      normalizeTextSegments([
        { text: "docs", href: "https://example.com", newTab: true, rel: "external nofollow" },
      ]),
    ).toEqual([
      {
        text: "docs",
        href: "https://example.com",
        target: "_blank",
        rel: "external nofollow noopener",
      },
    ]);
    expect(
      normalizeTextSegments([
        { text: "docs", href: "https://example.com", newTab: true, rel: "NOOPENER noreferrer" },
      ]),
    ).toEqual([
      {
        text: "docs",
        href: "https://example.com",
        target: "_blank",
        rel: "NOOPENER noreferrer",
      },
    ]);
  });

  it("ignores newTab and rel on plain-text segments with unsafe hrefs", () => {
    expect(
      normalizeTextSegments([
        { text: "x", href: "javascript:alert(1)", newTab: true, rel: "external" },
      ]),
    ).toEqual([{ text: "x" }]);
  });

  it("ignores non-true newTab and non-string rel values", () => {
    expect(
      normalizeTextSegments([
        { text: "a", href: "/a", newTab: 1 },
        { text: "b", href: "/b", rel: 42 },
      ]),
    ).toEqual([
      { text: "a", href: "/a" },
      { text: "b", href: "/b" },
    ]);
  });
});

describe("flattenTextSegments", () => {
  it("returns strings untouched", () => {
    expect(flattenTextSegments("same")).toBe("same");
    expect(flattenTextSegments("")).toBe("");
    expect(flattenTextSegments("a\nb")).toBe("a\nb");
  });

  it("concatenates valid segment text from arrays", () => {
    expect(
      flattenTextSegments([
        "Please read the ",
        { text: "terms", href: "/terms", newTab: true },
        " first.",
      ]),
    ).toBe("Please read the terms first.");
  });

  it("skips invalid entries without separators", () => {
    expect(
      flattenTextSegments(["a", 42, null, {}, { text: "b" }, ["c"], "", { no: 1 }]),
    ).toBe("ab");
  });

  it("flattens an array with no valid text to an empty string", () => {
    expect(flattenTextSegments([])).toBe("");
    expect(flattenTextSegments([42, null, {}, { text: "" }])).toBe("");
    expect(flattenTextSegments(["", ""])).toBe("");
  });

  it("flattens non-string non-array junk to an empty string", () => {
    expect(flattenTextSegments(undefined)).toBe("");
    expect(flattenTextSegments(null)).toBe("");
    expect(flattenTextSegments(42)).toBe("");
  });
});

describe("renderableTextSegments", () => {
  it("returns null for non-arrays and empty results", () => {
    expect(renderableTextSegments("text")).toBeNull();
    expect(renderableTextSegments(42)).toBeNull();
    expect(renderableTextSegments([])).toBeNull();
    expect(renderableTextSegments([42, { text: "" }])).toBeNull();
  });

  it("returns normalized segments for arrays with valid text", () => {
    expect(renderableTextSegments(["hello", { text: "world", href: "/w" }])).toEqual([
      { text: "hello" },
      { text: "world", href: "/w" },
    ]);
  });
});
