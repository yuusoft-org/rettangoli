// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStyleSheet,
  getStyleSheets,
  setStyleSheets,
} from "../../src/web/styleSheets.js";
import { initializeComponentDom } from "../../src/web/componentDom.js";

let constructor;
beforeEach(() => {
  constructor = vi.fn(() => {
    throw new TypeError("Illegal constructor");
  });
  vi.stubGlobal("CSSStyleSheet", constructor);
});
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

const createShadow = () =>
  document.createElement("div").attachShadow({ mode: "open" });

describe("stylesheet compatibility", () => {
  it("does not construct the CSSStyleSheet exposed by older WebKit", () => {
    const shadow = createShadow();
    const sheet = createStyleSheet(":host { color: red; }");
    setStyleSheets(shadow, [sheet]);
    expect(constructor).not.toHaveBeenCalled();
    expect(shadow.querySelector("style").textContent).toBe(
      ":host { color: red; }",
    );
    expect(getStyleSheets(shadow)).toEqual([sheet]);
  });

  it("shares a stylesheet across independent roots without moving style nodes", () => {
    const first = createShadow();
    const second = createShadow();
    const sheet = createStyleSheet(":host { display: flex; }");
    setStyleSheets(first, [sheet]);
    setStyleSheets(second, [sheet]);
    expect(first.firstChild).not.toBe(second.firstChild);
    expect(first.firstChild.textContent).toBe(second.firstChild.textContent);
  });

  it("replaces and rolls back owned styles without changing caller content", () => {
    const shadow = createShadow();
    const callerStyle = document.createElement("style");
    callerStyle.textContent = ":host { color: green; }";
    const input = document.createElement("input");
    input.value = "Keep this draft";
    shadow.append(callerStyle, input);
    const previous = [
      createStyleSheet(":host { color: red; }"),
      createStyleSheet("input { width: 100px; }"),
    ];
    const next = [createStyleSheet(":host { color: blue; }")];
    setStyleSheets(shadow, previous);
    setStyleSheets(shadow, next);
    expect(shadow.querySelectorAll("[data-rtgl-stylesheet]")).toHaveLength(1);
    expect(shadow.lastChild.textContent).toContain("blue");
    setStyleSheets(shadow, previous);
    expect(
      [...shadow.querySelectorAll("[data-rtgl-stylesheet]")].map(
        (element) => element.textContent,
      ),
    ).toEqual([":host { color: red; }", "input { width: 100px; }"]);
    expect(shadow.firstChild).toBe(callerStyle);
    expect(shadow.querySelector("input")).toBe(input);
    expect(input.value).toBe("Keep this draft");
    setStyleSheets(shadow, []);
    expect([...shadow.childNodes]).toEqual([callerStyle, input]);
  });

  it("restores fallback styles after an icon replaces its shadow markup", () => {
    const shadow = createShadow();
    const sheets = [createStyleSheet("svg { width: 24px; }")];
    setStyleSheets(shadow, sheets);
    shadow.innerHTML = "<svg><circle r='4'></circle></svg>";
    setStyleSheets(shadow, getStyleSheets(shadow));
    expect(shadow.querySelector("circle")).toBeTruthy();
    expect(shadow.querySelectorAll("style")).toHaveLength(1);
  });

  it("keeps the FE render target and its content across style updates", () => {
    const host = document.createElement("div");
    const first = initializeComponentDom({
      host,
      cssText: ".label { color: red; }",
    });
    first.renderTarget.innerHTML = "<span class='label'>Ready</span>";
    const label = first.renderTarget.firstChild;
    const second = initializeComponentDom({
      host,
      cssText: ".label { color: blue; }",
    });
    expect(second.renderTarget).toBe(first.renderTarget);
    expect(second.renderTarget.firstChild).toBe(label);
    expect(
      second.shadow.querySelectorAll("[data-rtgl-stylesheet]"),
    ).toHaveLength(2);
    expect(second.shadow.lastChild.textContent).toContain("blue");
    expect(constructor).not.toHaveBeenCalled();
  });

  it("continues to adopt native stylesheets without adding style elements", () => {
    class NativeStyleSheet {
      replaceSync(cssText) {
        this.cssText = cssText;
      }
    }
    vi.stubGlobal("CSSStyleSheet", NativeStyleSheet);
    const shadow = createShadow();
    const sheet = createStyleSheet(":host { color: blue; }");
    setStyleSheets(shadow, [sheet]);
    expect(sheet).toBeInstanceOf(NativeStyleSheet);
    expect(shadow.adoptedStyleSheets).toEqual([sheet]);
    expect(shadow.childNodes).toHaveLength(0);
  });
});
