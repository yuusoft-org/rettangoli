import RettangoliButton from "./primitives/button.js";
import RettangoliCarousel from "./primitives/carousel.js";
import RettangoliGrid from "./primitives/grid.js";
import RettangoliView from "./primitives/view.js";
import RettangoliText from "./primitives/text.js";
import RettangoliImage from "./primitives/image.js";
import RettangoliTag from "./primitives/tag.js";
import RettangoliSvg from "./primitives/svg.js";
import RettangoliInput from "./primitives/input.js";
import RettangoliInputDate from "./primitives/input-date.js";
import RettangoliInputTime from "./primitives/input-time.js";
import RettangoliInputDateTime from "./primitives/input-datetime.js";
import RettangoliInputNumber from "./primitives/input-number.js";
import RettangoliTextArea from "./primitives/textarea.js";
import RettangoliColorPicker from "./primitives/colorPicker.js";
import RettangoliSlider from "./primitives/slider.js";
import RettangoliCheckbox from "./primitives/checkbox.js";
import RettangoliDialog from "./primitives/dialog.js";
import RettangoliPopover from "./primitives/popover.js";
import { defineOrUpdatePrimitives } from "./hotPrimitiveRegistry.js";

const primitiveTagNames = [
  "rtgl-button",
  "rtgl-carousel",
  "rtgl-grid",
  "rtgl-view",
  "rtgl-text",
  "rtgl-image",
  "rtgl-tag",
  "rtgl-svg",
  "rtgl-input",
  "rtgl-input-date",
  "rtgl-input-time",
  "rtgl-input-datetime",
  "rtgl-input-number",
  "rtgl-textarea",
  "rtgl-color-picker",
  "rtgl-slider",
  "rtgl-checkbox",
  "rtgl-dialog",
  "rtgl-popover",
];

let currentPrimitiveFactories = [
  RettangoliButton,
  RettangoliCarousel,
  RettangoliGrid,
  RettangoliView,
  RettangoliText,
  RettangoliImage,
  RettangoliTag,
  RettangoliSvg,
  RettangoliInput,
  RettangoliInputDate,
  RettangoliInputTime,
  RettangoliInputDateTime,
  RettangoliInputNumber,
  RettangoliTextArea,
  RettangoliColorPicker,
  RettangoliSlider,
  RettangoliCheckbox,
  RettangoliDialog,
  RettangoliPopover,
];

const primitiveModulePaths = [
  "./primitives/button.js",
  "./primitives/carousel.js",
  "./primitives/grid.js",
  "./primitives/view.js",
  "./primitives/text.js",
  "./primitives/image.js",
  "./primitives/tag.js",
  "./primitives/svg.js",
  "./primitives/input.js",
  "./primitives/input-date.js",
  "./primitives/input-time.js",
  "./primitives/input-datetime.js",
  "./primitives/input-number.js",
  "./primitives/textarea.js",
  "./primitives/colorPicker.js",
  "./primitives/slider.js",
  "./primitives/checkbox.js",
  "./primitives/dialog.js",
  "./primitives/popover.js",
];

const createPrimitiveDefinitions = (factories) =>
  primitiveTagNames.map((tagName, index) => {
    const factory = factories[index];
    if (typeof factory !== "function") {
      throw new TypeError(`${tagName} does not export a primitive factory.`);
    }
    return {
      elementClass: factory({}),
      tagName,
    };
  });

const registerProductionPrimitives = () => {
  createPrimitiveDefinitions(currentPrimitiveFactories).forEach(
    ({ elementClass, tagName }) => {
      customElements.define(tagName, elementClass);
    },
  );
};

const applyHotPrimitiveFactories = (factories) => {
  let definitions;
  try {
    definitions = createPrimitiveDefinitions(factories);
  } catch (error) {
    console.error("[Rettangoli primitive HMR] Update failed.", error);
    throw error;
  }

  const result = defineOrUpdatePrimitives({ definitions });
  if (result.status === "incompatible") {
    const reason =
      result.message || "A primitive cannot be updated without a reload.";
    import.meta.hot.invalidate(`[Rettangoli primitive HMR] ${reason}`);
    return false;
  }
  if (result.status === "error") {
    console.error("[Rettangoli primitive HMR] Update failed.", result.error);
    throw result.error;
  }

  currentPrimitiveFactories = factories;
  return true;
};

if (import.meta.hot) {
  applyHotPrimitiveFactories(currentPrimitiveFactories);

  let pendingFactories = null;
  let pendingExpectedIndexes = new Set();
  let pendingReceivedIndexes = new Set();

  import.meta.hot.on("vite:beforeUpdate", ({ updates = [] }) => {
    pendingFactories = [...currentPrimitiveFactories];
    pendingExpectedIndexes = new Set();
    pendingReceivedIndexes = new Set();

    updates.forEach(({ acceptedPath = "" }) => {
      const normalizedPath = acceptedPath.split(/[?#]/, 1)[0];
      const index = primitiveModulePaths.findIndex((modulePath) =>
        normalizedPath.endsWith(modulePath.slice(1))
      );
      if (index >= 0) {
        pendingExpectedIndexes.add(index);
      }
    });
  });

  import.meta.hot.on("vite:afterUpdate", () => {
    if (!pendingFactories) {
      return;
    }

    const hasMissingModule = [...pendingExpectedIndexes].some(
      (index) => !pendingReceivedIndexes.has(index),
    );
    const nextFactories = pendingFactories;
    pendingFactories = null;
    pendingExpectedIndexes = new Set();
    pendingReceivedIndexes = new Set();

    if (hasMissingModule) {
      console.error(
        "[Rettangoli primitive HMR] Update was not applied because part of " +
          "the primitive module batch failed to load.",
      );
      return;
    }
    applyHotPrimitiveFactories(nextFactories);
  });

  import.meta.hot.accept(
    [
      "./primitives/button.js",
      "./primitives/carousel.js",
      "./primitives/grid.js",
      "./primitives/view.js",
      "./primitives/text.js",
      "./primitives/image.js",
      "./primitives/tag.js",
      "./primitives/svg.js",
      "./primitives/input.js",
      "./primitives/input-date.js",
      "./primitives/input-time.js",
      "./primitives/input-datetime.js",
      "./primitives/input-number.js",
      "./primitives/textarea.js",
      "./primitives/colorPicker.js",
      "./primitives/slider.js",
      "./primitives/checkbox.js",
      "./primitives/dialog.js",
      "./primitives/popover.js",
    ],
    (modules) => {
      pendingFactories ||= [...currentPrimitiveFactories];
      modules.forEach((module, index) => {
        if (module !== undefined) {
          pendingFactories[index] = module.default;
          pendingReceivedIndexes.add(index);
        }
      });
    },
  );
} else {
  registerProductionPrimitives();
}
