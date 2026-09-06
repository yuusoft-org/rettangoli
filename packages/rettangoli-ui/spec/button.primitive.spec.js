// @vitest-environment jsdom

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import createButton from "../src/primitives/button.js";

const TEST_TAG = "rtgl-button-primitive-test";

class CSSStyleSheetStub {
  replaceSync(cssText) {
    this.cssText = cssText;
  }
}

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", CSSStyleSheetStub);

  if (!customElements.get(TEST_TAG)) {
    customElements.define(TEST_TAG, createButton({}));
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rtgl-button primitive", () => {
  it("forwards a reactive accessible label to its native control", () => {
    const button = document.createElement(TEST_TAG);
    button.setAttribute("aria-label", "Add speaker");
    document.body.appendChild(button);

    const nativeButton = button.shadowRoot.querySelector("button");
    expect(nativeButton.getAttribute("aria-label")).toBe("Add speaker");

    button.setAttribute("aria-label", "Add narrator");
    expect(nativeButton.getAttribute("aria-label")).toBe("Add narrator");

    button.removeAttribute("aria-label");
    expect(nativeButton.hasAttribute("aria-label")).toBe(false);
  });

  it("reflects property-bound accessible labels without interpreting selector-shaped text", () => {
    const button = document.createElement(TEST_TAG);
    const label = 'Project "Save As" data-injected="true';

    button.ariaLabel = label;
    document.body.appendChild(button);

    expect(button.getAttribute("aria-label")).toBe(label);
    expect(button.hasAttribute("data-injected")).toBe(false);
    expect(
      button.shadowRoot.querySelector("button").getAttribute("aria-label"),
    ).toBe(label);

    button.ariaLabel = null;
    expect(button.hasAttribute("aria-label")).toBe(false);
    expect(
      button.shadowRoot.querySelector("button").hasAttribute("aria-label"),
    ).toBe(false);
  });
});

describe("rtgl-button rendering lifecycle", () => {
  const createIconButton = () => {
    const button = document.createElement(TEST_TAG);
    for (const [name, value] of Object.entries({
      sq: "",
      s: "sm",
      v: "gh",
      pre: "ellipsis",
      "aria-label": "Item actions",
    })) {
      button.setAttribute(name, value);
    }
    button.textContent = "Actions";
    return button;
  };

  it("initializes the final attributes on connection without detached icon work", () => {
    const button = createIconButton();
    expect(button.shadowRoot.childNodes).toHaveLength(0);
    document.body.appendChild(button);
    const surface = button.shadowRoot.querySelector("button");
    expect(surface.getAttribute("aria-label")).toBe("Item actions");
    expect(surface.querySelectorAll("rtgl-svg")).toHaveLength(1);
    expect(surface.querySelector("rtgl-svg").getAttribute("wh")).toBe("14");
    expect(surface.querySelector("slot").assignedNodes()[0].textContent).toBe(
      "Actions",
    );
  });

  it("preserves focus, surface, slot, and icons during attribute updates", () => {
    const button = createIconButton();
    document.body.appendChild(button);
    const surface = button.shadowRoot.querySelector("button");
    const children = [...surface.children];
    const observer = new MutationObserver(() => {});
    observer.observe(button.shadowRoot, { childList: true, subtree: true });
    surface.focus();
    button.setAttribute("aria-label", "More actions");
    button.setAttribute("v", "se");
    button.setAttribute("s", "lg");
    button.setAttribute("pre", "edit");
    expect(button.shadowRoot.activeElement).toBe(surface);
    expect(button.shadowRoot.querySelector("button")).toBe(surface);
    expect([...surface.children]).toEqual(children);
    expect(children[0].getAttribute("svg")).toBe("edit");
    expect(children[0].getAttribute("wh")).toBe("22");
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it("does no DOM work for repeated attribute values", () => {
    const button = createIconButton();
    document.body.appendChild(button);
    const observer = new MutationObserver(() => {});
    observer.observe(button.shadowRoot, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    button.setAttribute("pre", "ellipsis");
    button.setAttribute("s", "sm");
    button.setAttribute("aria-label", "Item actions");
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it("updates and removes either icon without recreating the other", () => {
    const button = createIconButton();
    button.setAttribute("suf", "chevronRight");
    document.body.appendChild(button);
    const surface = button.shadowRoot.querySelector("button");
    const [prefix, slot, suffix] = surface.children;
    button.removeAttribute("pre");
    expect([...surface.children]).toEqual([slot, suffix]);
    button.setAttribute("suf", "check");
    expect(surface.lastElementChild).toBe(suffix);
    expect(suffix.getAttribute("svg")).toBe("check");
    button.setAttribute("pre", "add");
    expect(surface.firstElementChild).not.toBe(prefix);
    expect(surface.firstElementChild.getAttribute("svg")).toBe("add");
    expect(surface.lastElementChild).toBe(suffix);
    button.removeAttribute("suf");
    expect(surface.lastElementChild).toBe(slot);
  });

  it("retains nodes across reconnects and applies changes made while detached", () => {
    const button = createIconButton();
    document.body.appendChild(button);
    const surface = button.shadowRoot.querySelector("button");
    const icon = surface.querySelector("rtgl-svg");
    button.remove();
    button.setAttribute("pre", "edit");
    button.setAttribute("s", "lg");
    document.body.appendChild(button);
    expect(button.shadowRoot.querySelector("button")).toBe(surface);
    expect(surface.querySelector("rtgl-svg")).toBe(icon);
    expect(icon.getAttribute("svg")).toBe("edit");
    expect(icon.getAttribute("wh")).toBe("22");
  });

  it("preserves slot and icons when switching between links and disabled buttons", () => {
    const button = createIconButton();
    button.setAttribute("suf", "chevronRight");
    document.body.appendChild(button);
    const children = [...button.shadowRoot.querySelector("button").children];
    button.setAttribute("href", "/destination");
    button.setAttribute("new-tab", "");
    let surface = button.shadowRoot.querySelector("a");
    expect([...surface.children]).toEqual(children);
    expect(surface.getAttribute("href")).toBe("/destination");
    expect(surface.getAttribute("target")).toBe("_blank");
    expect(surface.getAttribute("rel")).toContain("noopener");
    button.setAttribute("disabled", "");
    surface = button.shadowRoot.querySelector("button");
    expect(surface.disabled).toBe(true);
    expect(surface.hasAttribute("href")).toBe(false);
    expect([...surface.children]).toEqual(children);
    button.removeAttribute("disabled");
    surface = button.shadowRoot.querySelector("a");
    expect([...surface.children]).toEqual(children);
    button.removeAttribute("new-tab");
    expect(surface.hasAttribute("target")).toBe(false);
    button.setAttribute("rel", "nofollow");
    expect(surface.getAttribute("rel")).toBe("nofollow");
    button.removeAttribute("href");
    expect([...button.shadowRoot.querySelector("button").children]).toEqual(
      children,
    );
  });

  it("updates width and square sizing without replacing its control", () => {
    const button = createIconButton();
    document.body.appendChild(button);
    const surface = button.shadowRoot.querySelector("button");
    button.removeAttribute("sq");
    button.setAttribute("w", "200");
    expect(button.style.width).toBe("200px");
    expect(surface.style.width).toBe("100%");
    button.setAttribute("w", "f");
    expect(button.style.width).toBe("var(--width-stretch)");
    button.setAttribute("sq", "");
    expect(button.style.width).toBe("");
    expect(surface.style.width).toBe("");
    expect(button.shadowRoot.querySelector("button")).toBe(surface);
  });

  it("reads viewport geometry only for responsive sizes and reuses icons on resize", () => {
    const original = Object.getOwnPropertyDescriptor(window, "innerWidth");
    let width = 500;
    const readWidth = vi.fn(() => width);
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      get: readWidth,
    });
    try {
      const button = createIconButton();
      document.body.appendChild(button);
      const icon = button.shadowRoot.querySelector("rtgl-svg");
      expect(readWidth).not.toHaveBeenCalled();
      button.setAttribute("md-s", "lg");
      button.setAttribute("sm-s", "md");
      expect(icon.getAttribute("wh")).toBe("18");
      width = 700;
      window.dispatchEvent(new Event("resize"));
      expect(icon.getAttribute("wh")).toBe("22");
      width = 1000;
      window.dispatchEvent(new Event("resize"));
      expect(icon.getAttribute("wh")).toBe("14");
      expect(button.shadowRoot.querySelector("rtgl-svg")).toBe(icon);
      button.remove();
      readWidth.mockClear();
      window.dispatchEvent(new Event("resize"));
      expect(readWidth).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "innerWidth", original);
    }
  });
});
