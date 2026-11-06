// @vitest-environment jsdom
// Change detector for the CSS and DOM that the 20 primitives generate: the
// static adopted sheets, the per-instance <style>, the host `style` attribute
// and the shadow structure, for ~300 attribute sets and for attribute changes
// after connect. spec/__snapshots__/primitiveStyles.hashes.json holds one short
// hash per entry, so a failure names the entries that changed. Update it only
// with an explained diff: `bunx vitest run spec/primitiveStyles.snapshot.spec.js -u`.
//
// To see the full text behind a changed hash, run this spec on both sides with
// PRIMITIVE_STYLES_DUMP=<file.json> and diff the two dumps.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RettangoliButton,
  RettangoliCarousel,
  RettangoliCheckbox,
  RettangoliColorPicker,
  RettangoliDialog,
  RettangoliGrid,
  RettangoliImage,
  RettangoliInput,
  RettangoliInputDate,
  RettangoliInputDateTime,
  RettangoliInputDuration,
  RettangoliInputNumber,
  RettangoliInputTime,
  RettangoliPopover,
  RettangoliSlider,
  RettangoliSvg,
  RettangoliTag,
  RettangoliText,
  RettangoliTextArea,
  RettangoliView,
} from "../src/index.js";
import corpus from "./fixtures/primitiveStyleCorpus.json";

const factories = {
  "rtgl-button": RettangoliButton,
  "rtgl-carousel": RettangoliCarousel,
  "rtgl-checkbox": RettangoliCheckbox,
  "rtgl-color-picker": RettangoliColorPicker,
  "rtgl-dialog": RettangoliDialog,
  "rtgl-grid": RettangoliGrid,
  "rtgl-image": RettangoliImage,
  "rtgl-input": RettangoliInput,
  "rtgl-input-date": RettangoliInputDate,
  "rtgl-input-datetime": RettangoliInputDateTime,
  "rtgl-input-duration": RettangoliInputDuration,
  "rtgl-input-number": RettangoliInputNumber,
  "rtgl-input-time": RettangoliInputTime,
  "rtgl-popover": RettangoliPopover,
  "rtgl-slider": RettangoliSlider,
  "rtgl-svg": RettangoliSvg,
  "rtgl-tag": RettangoliTag,
  "rtgl-text": RettangoliText,
  "rtgl-textarea": RettangoliTextArea,
  "rtgl-view": RettangoliView,
};
const tags = Object.keys(factories);

const sha = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const SAMPLE_ICON = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';

// Records each stylesheet's text, so adopted sheets can be read back.
class RecordingStyleSheet {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

const settle = () => vi.advanceTimersByTime(100);

// Per-instance output. The static sheets are hashed once per tag instead.
const capture = (element) => {
  const shadow = element.shadowRoot;
  return {
    styles: [...shadow.querySelectorAll("style")].map((style) => style.textContent),
    hostStyle: element.getAttribute("style"),
    structure: shadow.innerHTML.replace(/<style>[\s\S]*?<\/style>/g, "<style></style>"),
  };
};

const apply = (element, attrs) => {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
};

const captureEntry = ({ tag, attrs, updates }) => {
  const element = document.createElement(tag);
  apply(element, attrs);
  document.body.append(element);
  settle();
  const result = { initial: capture(element) };
  if (updates) {
    apply(element, updates);
    settle();
    result.updated = capture(element);
  }
  element.remove();
  settle();
  return result;
};

const dump = {};

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", RecordingStyleSheet);
  // jsdom has no modal dialogs; open dialogs and popovers just flip `open`.
  Object.assign(HTMLDialogElement.prototype, {
    show() { this.open = true; },
    showModal() { this.open = true; },
    close() { this.open = false; },
  });
  for (const [tag, factory] of Object.entries(factories)) {
    customElements.define(tag, factory({}));
  }
  // Every icon name the corpus uses renders the same shape, except "missing".
  for (const { tag, attrs } of corpus) {
    if (tag === "rtgl-svg" && attrs.svg !== "missing") {
      customElements.get(tag).addIcon(attrs.svg, SAMPLE_ICON);
    }
  }
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
});

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (process.env.PRIMITIVE_STYLES_DUMP) {
    writeFileSync(process.env.PRIMITIVE_STYLES_DUMP, JSON.stringify(dump, null, 1));
  }
});

describe("primitive style output", () => {
  it("covers every primitive tag with unique entry ids", () => {
    expect([...new Set(corpus.map(({ tag }) => tag))].sort()).toEqual(tags);
    expect(new Set(corpus.map(({ id }) => id)).size).toBe(corpus.length);
  });

  it("matches the recorded hashes", async () => {
    // A pristine instance's adopted sheets are the static sheets of its class.
    const sheets = {};
    for (const tag of tags) {
      const texts = document
        .createElement(tag)
        .shadowRoot.adoptedStyleSheets.map((sheet) => sheet.cssText);
      sheets[tag] = {
        blocks: texts.join("").split("{").length - 1,
        sha256: sha(texts.join("\n/*--*/\n")),
      };
      dump[`sheet ${tag}`] = texts;
    }
    const entries = {};
    for (const entry of corpus) {
      const captured = captureEntry(entry);
      dump[entry.id] = { ...entry, ...captured };
      entries[entry.id] = sha(JSON.stringify(captured));
    }
    const lines = (record, format) =>
      Object.entries(record)
        .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(format(value))}`)
        .join(",\n");
    await expect(
      `{\n "sheets": {\n${lines(sheets, ({ blocks, sha256 }) => `${blocks} blocks ${sha256}`)}\n },\n` +
        ` "entries": {\n${lines(entries, (hash) => hash)}\n }\n}\n`,
    ).toMatchFileSnapshot("./__snapshots__/primitiveStyles.hashes.json");
  });
});
