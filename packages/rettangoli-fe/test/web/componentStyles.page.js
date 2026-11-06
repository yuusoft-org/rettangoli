/**
 * Browser-side half of the component style sheet checks (componentStyles.mjs
 * loads it into the page; bare imports resolve through its import map).
 */
import { parse } from "jempl";
import { defineOrUpdateComponent } from "../../src/index.js";

const RED = "rgb(255, 0, 0)";
const BLUE = "rgb(0, 0, 255)";

const register = (color, fingerprint) => defineOrUpdateComponent({
  componentConfig: {
    schema: {
      componentName: "x-styled",
      propsSchema: { type: "object", properties: {} },
    },
    view: {
      template: parse([{ "div.box": "styled" }]),
      refs: {},
      styles: { ".box": { color } },
    },
    store: {},
    handlers: {},
    methods: {},
    constants: {},
  },
  componentId: "components/styled",
  deps: {},
  fingerprint,
});

// The polyfill applies sheets from a MutationObserver; give it a frame.
const nextFrame = () => new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(resolve));
});

const countDistinct = (values) => new Set(values).size;

const describeElements = (elements) => ({
  colors: elements.map((el) => getComputedStyle(el.shadowRoot.querySelector(".box")).color),
  sheetCounts: elements.map((el) => el.shadowRoot.adoptedStyleSheets.length),
  // The polyfill emulates each adopted sheet with a <style> in the root.
  styleElements: elements.map((el) => el.shadowRoot.querySelectorAll("style").length),
  // 1 when every instance shares the sheet, elements.length when none do.
  commonSheets: countDistinct(elements.map((el) => el.shadowRoot.adoptedStyleSheets[0])),
  componentSheets: countDistinct(elements.map((el) => el.shadowRoot.adoptedStyleSheets[1])),
  distinctArrays: countDistinct(elements.map((el) => el.shadowRoot.adoptedStyleSheets))
    === elements.length,
});

export const runComponentStyleScenario = async () => {
  const container = document.body.appendChild(document.createElement("div"));
  register(RED, "v1");
  const elements = [1, 2, 3].map(() =>
    container.appendChild(document.createElement("x-styled")));
  await nextFrame();
  const initial = describeElements(elements);
  const redSheet = elements[1].shadowRoot.adoptedStyleSheets[1];

  elements[1].remove();
  await nextFrame();
  container.appendChild(elements[1]);
  await nextFrame();
  const reconnected = {
    ...describeElements(elements),
    keepsSheet: elements[1].shadowRoot.adoptedStyleSheets[1] === redSheet,
  };

  const { updatedInstances } = register(BLUE, "v2");
  await nextFrame();
  const hotUpdated = {
    ...describeElements(elements),
    updatedInstances,
    replacedSheet: elements.every((el) =>
      !el.shadowRoot.adoptedStyleSheets.includes(redSheet)),
  };

  elements.push(container.appendChild(document.createElement("x-styled")));
  await nextFrame();
  const afterUpdate = describeElements(elements);
  container.remove();

  return {
    expected: { red: RED, blue: BLUE },
    initial,
    reconnected,
    hotUpdated,
    afterUpdate,
  };
};

// Connects `count` styled instances, removes them, and keeps only weak
// references, so the Node side can force a GC and count the survivors.
let removedInstances = [];

export const connectAndRemoveInstances = async (count) => {
  const container = document.body.appendChild(document.createElement("div"));
  const elements = Array.from({ length: count }, () =>
    container.appendChild(document.createElement("x-styled")));
  await nextFrame();
  const styled = elements.every((el) =>
    getComputedStyle(el.shadowRoot.querySelector(".box")).color === BLUE);
  removedInstances = elements.map((el) => new WeakRef(el));
  container.remove();
  await nextFrame();
  return { styled };
};

export const countLiveRemovedInstances = () =>
  removedInstances.filter((ref) => ref.deref() !== undefined).length;
