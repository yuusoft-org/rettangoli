// @vitest-environment jsdom

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { setUiMessages } from "../src/common/uiMessages.js";
import { handleBeforeMount as dropdownMenuBeforeMount } from "../src/components/dropdown-menu/dropdown-menu.handlers.js";
import { handleBeforeMount as formBeforeMount } from "../src/components/form/form.handlers.js";
import { handleBeforeMount as popoverInputBeforeMount } from "../src/components/popover-input/popover-input.handlers.js";
import { handleBeforeMount as segmentedControlBeforeMount } from "../src/components/segmented-control/segmented-control.handlers.js";
import { handleBeforeMount as selectBeforeMount } from "../src/components/select/select.handlers.js";
import { handleBeforeMount as tableBeforeMount } from "../src/components/table/table.handlers.js";
import { handleBeforeMount as tabsBeforeMount } from "../src/components/tabs/tabs.handlers.js";
import { handleBeforeMount as tagSelectBeforeMount } from "../src/components/tag-select/tag-select.handlers.js";
import createCarousel from "../src/primitives/carousel.js";
import createTag from "../src/primitives/tag.js";

const CAROUSEL_TAG = "rtgl-carousel-messages-test";
const TAG_TAG = "rtgl-tag-messages-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

class ResizeObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  if (!customElements.get(CAROUSEL_TAG)) {
    customElements.define(CAROUSEL_TAG, createCarousel({}));
  }
  if (!customElements.get(TAG_TAG)) {
    customElements.define(TAG_TAG, createTag({}));
  }
});

afterEach(() => {
  setUiMessages({});
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const COMPONENTS = [
  ["dropdown-menu", dropdownMenuBeforeMount, {}],
  [
    "form",
    formBeforeMount,
    { store: { resetFormValues() {} }, props: { form: { fields: [] } } },
  ],
  ["popover-input", popoverInputBeforeMount, {}],
  ["segmented-control", segmentedControlBeforeMount, {}],
  ["select", selectBeforeMount, {}],
  ["table", tableBeforeMount, {}],
  ["tabs", tabsBeforeMount, {}],
  ["tag-select", tagSelectBeforeMount, {}],
];

describe("components and UI message changes", () => {
  it.each(COMPONENTS)(
    "%s redraws while mounted and stops after cleanup",
    (_name, handleBeforeMount, extraDeps) => {
      const render = vi.fn();
      const cleanup = handleBeforeMount({
        store: {},
        props: {},
        render,
        ...extraDeps,
      });
      render.mockClear();

      setUiMessages({ tabs: "Onglets" });
      expect(render).toHaveBeenCalledTimes(1);

      cleanup();
      setUiMessages({});
      expect(render).toHaveBeenCalledTimes(1);
    },
  );
});

describe("primitives and UI message changes", () => {
  it("relabel the carousel while connected and on reconnect", () => {
    const carousel = document.createElement(CAROUSEL_TAG);
    carousel.append(document.createElement("div"), document.createElement("div"));
    document.body.append(carousel);
    const button = (id) => carousel.shadowRoot.getElementById(id);
    const pagerLabels = () =>
      [...carousel.shadowRoot.querySelectorAll("[part~=pager-button]")].map(
        (pagerButton) => pagerButton.getAttribute("aria-label"),
      );

    setUiMessages({ carouselNext: "Diapositive suivante" });
    expect(button("next-button").getAttribute("aria-label")).toBe(
      "Diapositive suivante",
    );

    carousel.remove();
    setUiMessages({
      carouselPrevious: "Diapositive précédente",
      carouselGoTo: "Aller à la diapositive {value}",
    });
    document.body.append(carousel);

    expect(button("prev-button").getAttribute("aria-label")).toBe(
      "Diapositive précédente",
    );
    expect(button("next-button").getAttribute("aria-label")).toBe("Next slide");
    expect(pagerLabels()).toEqual([
      "Aller à la diapositive 1",
      "Aller à la diapositive 2",
    ]);
  });

  it("relabel the tag's remove button while connected and on reconnect", () => {
    const tag = document.createElement(TAG_TAG);
    tag.setAttribute("removable", "");
    document.body.append(tag);
    const removeLabel = () =>
      tag.shadowRoot.querySelector(".removeButton").getAttribute("aria-label");
    expect(removeLabel()).toBe("Remove tag");

    setUiMessages({ tagRemove: "Retirer l’étiquette" });
    expect(removeLabel()).toBe("Retirer l’étiquette");

    tag.remove();
    setUiMessages({ tagRemove: "Quitar etiqueta" });
    document.body.append(tag);
    expect(removeLabel()).toBe("Quitar etiqueta");
  });
});
