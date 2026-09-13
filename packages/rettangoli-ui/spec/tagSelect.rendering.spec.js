// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { parse } from "jempl";
import { createComponent } from "@rettangoli/fe";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import createPopover from "../src/primitives/popover.js";
import * as handlers from "../src/components/tag-select/tag-select.handlers.js";
import * as methods from "../src/components/tag-select/tag-select.methods.js";
import * as store from "../src/components/tag-select/tag-select.store.js";

const readYaml = (name) =>
  yaml.load(
    readFileSync(`src/components/tag-select/tag-select.${name}.yaml`, "utf8"),
  );

beforeAll(() => {
  Object.defineProperty(CSSStyleSheet.prototype, "replaceSync", {
    configurable: true,
    value() {},
  });
  window.matchMedia = () => ({ matches: false });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value() {
        this.open = false;
      },
    },
  });
  customElements.define("rtgl-popover", createPopover({}));
  const view = readYaml("view");
  view.template = parse(view.template);
  customElements.define(
    "rtgl-tag-select",
    createComponent(
      {
        view,
        schema: readYaml("schema"),
        handlers,
        store,
        methods,
      },
      {},
    ),
  );
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback) =>
    setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("rtgl-tag-select rendering", () => {
  it("updates an open empty picker without losing options or cloning selected chips", async () => {
    const renderError = vi.spyOn(console, "error").mockImplementation(() => {});
    const select = document.createElement("rtgl-tag-select");
    select.options = [];
    select.selectedValues = [];
    document.body.append(select);
    select.shadowRoot.querySelector("#trigger").click();
    await vi.runAllTimersAsync();
    const popover = select.shadowRoot.querySelector("rtgl-popover");
    expect(popover.textContent).toContain("No tags available");

    for (let count = 1; count <= 3; count += 1) {
      const options = Array.from({ length: count }, (_, index) => ({
        value: `tag-${index + 1}`,
        label: `Tag ${index + 1}`,
      }));
      select.options = options;
      select.selectedValues = options.map((option) => option.value);
      await vi.runAllTimersAsync();
      for (let index = 0; index < 3; index += 1) select.render();
      await vi.runAllTimersAsync();

      expect(renderError).not.toHaveBeenCalled();
      expect(select.shadowRoot.querySelector("rtgl-popover")).toBe(popover);
      expect(popover.textContent).not.toContain("No tags available");
      expect(
        [...popover.querySelectorAll('[id^="option"]')].map((node) =>
          node.textContent.trim(),
        ),
      ).toEqual(options.map((option) => option.label));
      expect(
        [
          ...select.shadowRoot
            .querySelector("#trigger")
            .querySelectorAll("rtgl-tag"),
        ].map((node) => node.textContent.trim()),
      ).toEqual(options.map((option) => option.label));
    }

    select.options = [];
    select.selectedValues = [];
    await vi.runAllTimersAsync();
    expect(popover.querySelectorAll('[id^="option"]')).toHaveLength(0);
    expect(popover.textContent).toContain("No tags available");
    expect(renderError).not.toHaveBeenCalled();
  });
});
