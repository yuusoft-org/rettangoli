// Mounts the real ui components in jsdom the same way `rtgl fe build` does
// (packages/rettangoli-fe/src/cli/frontendEntrySource.js): YAML view with a
// jempl-parsed template, store/handlers/methods modules, `createComponent`
// from the public `@rettangoli/fe` entry, and the `deps` that src/setup.js
// provides. Specs that import this file need `// @vitest-environment jsdom`.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createComponent } from "@rettangoli/fe";
import { parse as parseTemplate } from "jempl";
import { load as loadYaml } from "js-yaml";
import { vi } from "vitest";

import { deps } from "../../src/setup.js";

export const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const MODULE_FILE_TYPES = ["handlers", "store", "methods"];
const YAML_FILE_TYPES = ["view", "constants", "schema"];

const componentFile = (name, fileType, extension) =>
  path.join(UI_ROOT, "src/components", name, `${name}.${fileType}.${extension}`);

export const readYamlFile = (filePath) => loadYaml(readFileSync(filePath, "utf8")) ?? {};

/** Reads and parses one component the way the generated entry file does. */
export const loadComponentConfig = async (name) => {
  const config = {};
  for (const fileType of YAML_FILE_TYPES) {
    const filePath = componentFile(name, fileType, "yaml");
    if (!existsSync(filePath)) continue;
    config[fileType] = readYamlFile(filePath);
    if (fileType === "view") {
      config.view.template = parseTemplate(config.view.template);
    }
  }
  for (const fileType of MODULE_FILE_TYPES) {
    const filePath = componentFile(name, fileType, "js");
    // Only a missing file is optional; an import error must fail the spec.
    if (existsSync(filePath)) {
      config[fileType] = await import(/* @vite-ignore */ filePath);
    }
  }
  return config;
};

/** jsdom has no CSSStyleSheet#replaceSync, matchMedia or dialog show/close. */
const installDomStubs = () => {
  if (typeof CSSStyleSheet.prototype.replaceSync !== "function") {
    Object.defineProperty(CSSStyleSheet.prototype, "replaceSync", {
      configurable: true,
      value() {},
    });
  }
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    });
  }
  const dialogMethods = {
    show() { this.open = true; },
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
  for (const [name, method] of Object.entries(dialogMethods)) {
    if (typeof HTMLDialogElement.prototype[name] !== "function") {
      Object.defineProperty(HTMLDialogElement.prototype, name, {
        configurable: true,
        value: method,
      });
    }
  }
};

/** Defines the 20 primitives exactly as the ui bundles do. */
export const definePrimitives = async () => {
  installDomStubs();
  await import("../../src/registerPrimitives.js");
};

/** Defines `rtgl-<name>` components (any order; the entry sorts them too). */
export const defineComponents = async (names) => {
  installDomStubs();
  for (const name of [...names].sort()) {
    const config = await loadComponentConfig(name);
    const elementName = config.schema?.componentName;
    if (!elementName) {
      throw new Error(`Missing schema.componentName for components/${name}.`);
    }
    if (customElements.get(elementName)) continue;
    customElements.define(
      elementName,
      createComponent({ ...config }, { ...deps.components }),
    );
  }
};

/** Fake timers plus a rAF that fires on the next timer tick. Call in beforeEach. */
export const installTimers = () => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(() => callback(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id) => clearTimeout(id));
};

/** Call in afterEach. */
export const removeTimers = () => {
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
};

/** Runs every pending timer and animation frame, awaiting microtasks between them. */
export const flush = () => vi.runAllTimersAsync();

/** Creates `<tag>`, assigns props as properties and attrs as attributes, appends it and flushes. */
export const mountElement = async (tag, { props = {}, attrs = {}, parent = document.body } = {}) => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  Object.assign(element, props);
  parent.append(element);
  await flush();
  return element;
};

// ---- user-level interaction helpers shared by the mount specs ----

/** The element rtgl-form renders for a field name. */
export const findField = (host, name) =>
  host.shadowRoot.querySelector(`[data-field-name="${name}"]`);

const innerControl = (element) => element.shadowRoot.querySelector("input, textarea");

/** Types into rtgl-input, rtgl-input-number or rtgl-textarea (native `input` event). */
export const typeInto = (element, text) => {
  const control = innerControl(element);
  control.value = text;
  control.dispatchEvent(new Event("input", { bubbles: true }));
};

/** Commits the edit like a blur does (native `change` event). */
export const commitEdit = (element) => {
  innerControl(element).dispatchEvent(new Event("change", { bubbles: true }));
};

/** Toggles an rtgl-checkbox the way a click does. */
export const setChecked = (checkbox, checked) => {
  const control = innerControl(checkbox);
  control.checked = checked;
  control.dispatchEvent(new Event("change", { bubbles: true }));
};

/** Opens an rtgl-select and clicks the option at `index`. */
export const pickSelectOption = async (select, index) => {
  select.shadowRoot.querySelector("#selectButton").click();
  await flush();
  select.shadowRoot.querySelector(`#option${index}`).click();
  await flush();
};

/** What the user sees in a control, by tag. */
export const readDisplayed = (element) => {
  const root = element.shadowRoot;
  switch (element.tagName.toLowerCase()) {
    case "rtgl-input":
    case "rtgl-input-number":
    case "rtgl-input-duration":
    case "rtgl-textarea":
      return innerControl(element).value;
    case "rtgl-checkbox":
      return innerControl(element).checked;
    case "rtgl-select":
      return root.querySelector("#selectButton rtgl-text[ellipsis]").textContent;
    case "rtgl-segmented-control":
      return [...root.querySelectorAll('[role="button"][aria-pressed="true"]')]
        .map((option) => option.textContent.trim());
    case "rtgl-tag-select":
      return [...root.querySelectorAll("#trigger rtgl-tag")]
        .map((tag) => tag.textContent.trim());
    case "rtgl-slider-input":
      return {
        slider: root.querySelector("#slider").getAttribute("value"),
        input: innerControl(root.querySelector("#input")).value,
      };
    case "rtgl-popover-input":
      return root.querySelector("#textDisplay rtgl-text").textContent;
    case "rtgl-color-picker":
      return root.querySelector(".swatch").style.background;
    default:
      throw new Error(`readDisplayed: no reader for <${element.tagName.toLowerCase()}>`);
  }
};

/**
 * Mounts `<rtgl-form>` and records the events it emits as `[type, detail]`
 * pairs. `key` is set as an attribute, as a rendered template does; any other
 * form prop (`context`, ...) is assigned as a property.
 */
export const mountForm = async (form, defaultValues, { key, ...props } = {}) => {
  const host = await mountElement("rtgl-form", {
    props: { form, defaultValues, ...props },
    attrs: key === undefined ? {} : { key },
  });
  const events = [];
  for (const type of ["form-input", "form-change", "form-action"]) {
    host.addEventListener(type, (event) => events.push([type, event.detail]));
  }
  return { host, events, field: (name) => findField(host, name) };
};
