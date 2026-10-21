// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";

import createComponent from "../../src/createComponent.js";
import { renderComponent } from "../../src/server/index.js";

let componentNumber = 0;
let frames;

// jsdom does not parse declarative shadow roots. Attach them the way a
// browser's parser does, before any component is defined.
const attachDeclarativeShadowRoots = (node) => {
  for (const template of [...node.querySelectorAll("template[shadowrootmode]")]) {
    const host = template.parentElement;
    const shadow = host.attachShadow({ mode: template.getAttribute("shadowrootmode") });
    shadow.append(template.content);
    template.remove();
    attachDeclarativeShadowRoots(shadow);
  }
};

const serverRender = (html) => {
  document.body.innerHTML = html;
  attachDeclarativeShadowRoots(document.body);
};

const renderTargetOf = (host) =>
  host.shadowRoot.querySelector("[data-rtgl-render-target]");

const flushFrames = () => {
  const pending = frames.splice(0);
  pending.forEach((callback) => callback());
};

const createFixture = ({ childItems = ({ props }) => props.items } = {}) => {
  const id = componentNumber++;
  const parentName = `x-hyd-parent-${id}`;
  const childName = `x-hyd-child-${id}`;
  const handleGo = vi.fn();

  const parent = {
    schema: {
      componentName: parentName,
      propsSchema: { type: "object", properties: { title: {}, items: {} } },
    },
    view: {
      refs: { go: { eventListeners: { click: { handler: "handleGo" } } } },
      styles: {},
      template: parse([
        {
          "div#page.box data-kind=page": [
            { h1: "${title}" },
            { [`${childName} :label=\${title} :items=\${items}`]: null },
            { "button#go": "Go" },
          ],
        },
      ]),
    },
    store: {
      selectViewData: ({ props }) => ({ title: props.title, items: props.items }),
    },
    handlers: { handleGo },
  };

  const child = {
    schema: {
      componentName: childName,
      propsSchema: { type: "object", properties: { label: {}, items: {} } },
    },
    view: {
      refs: {},
      styles: {},
      template: parse([
        {
          ul: [{ "$for item, i in items": [{ "li#item${i}": "${label} ${item}" }] }],
        },
      ]),
    },
    store: {
      selectViewData: (context) => ({
        label: context.props.label,
        items: childItems(context) || [],
      }),
    },
    handlers: {},
  };

  const html = (props) =>
    renderComponent({
      component: parentName,
      components: [parent, child],
      props,
      serializeProps: true,
    }).html;

  // Parents first, the order a page with server markup defines them in.
  const define = (configs = [parent, child]) => {
    configs.forEach((config) =>
      customElements.define(config.schema.componentName, createComponent(config, {})));
  };

  return { parentName, childName, parent, child, html, define, handleGo };
};

beforeEach(() => {
  frames = [];
  delete globalThis.__rtglSsr;
  vi.stubGlobal("requestAnimationFrame", (callback) => frames.push(callback));
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  delete globalThis.__rtglSsr;
});

describe("hydrating server-rendered components", () => {
  it("keeps the server's nodes, binds listeners and passes props down", () => {
    const fixture = createFixture();
    serverRender(fixture.html({ title: "Hi", items: [1, 2] }));

    const host = document.querySelector(fixture.parentName);
    const heading = renderTargetOf(host).querySelector("h1");
    const childHost = renderTargetOf(host).querySelector(fixture.childName);
    const items = [...renderTargetOf(childHost).querySelectorAll("li")];
    expect(items.map((li) => li.textContent)).toEqual(["Hi 1", "Hi 2"]);

    fixture.define();

    expect(renderTargetOf(host).querySelector("h1")).toBe(heading);
    expect(host.shadowRoot.querySelectorAll("h1")).toHaveLength(1);
    expect(host.shadowRoot.querySelectorAll("[data-rtgl-render-target]")).toHaveLength(1);
    expect(renderTargetOf(host).querySelector(fixture.childName)).toBe(childHost);
    expect([...renderTargetOf(childHost).querySelectorAll("li")]).toEqual(items);
    expect(childHost.props.items).toEqual([1, 2]);

    renderTargetOf(host).querySelector("button").click();
    expect(fixture.handleGo).toHaveBeenCalledTimes(1);

    expect(host.hasAttribute("data-rtgl-hydrate")).toBe(false);
    expect(childHost.hasAttribute("data-rtgl-hydrate")).toBe(false);
    expect(host.querySelector("script[data-rtgl-props]")).toBeNull();
    expect(globalThis.__rtglSsr).toEqual({ hydrated: 2, mismatched: 0, reasons: [] });
  });

  it("assigns the serialized root props before the store is created", () => {
    const fixture = createFixture();
    const createInitialState = vi.fn(({ props }) => ({ seenTitle: props.title }));
    fixture.parent.store = { ...fixture.parent.store, createInitialState };
    serverRender(fixture.html({ title: "Hi", items: [] }));
    createInitialState.mockClear();

    fixture.define();

    const host = document.querySelector(fixture.parentName);
    expect(createInitialState).toHaveBeenCalledTimes(1);
    expect(host.store.getState()).toEqual({ seenTitle: "Hi" });
  });

  it("lets props set before the upgrade win over serialized ones", () => {
    const fixture = createFixture();
    serverRender(fixture.html({ title: "Hi", items: [1] }));
    const host = document.querySelector(fixture.parentName);
    host.title = "Bye";

    fixture.define();

    expect(renderTargetOf(host).querySelector("h1").textContent).toBe("Bye");
    expect(host.shadowRoot.querySelectorAll("h1")).toHaveLength(1);
    expect(globalThis.__rtglSsr.mismatched).toBeGreaterThan(0);
    expect(globalThis.__rtglSsr.reasons.join("\n")).toContain("text differs");
  });

  it("replaces a subtree whose structure differs, without duplicating it", () => {
    const fixture = createFixture({
      childItems: ({ props }) => [...props.items, 3],
    });
    serverRender(fixture.html({ title: "Hi", items: [1, 2] }));
    const host = document.querySelector(fixture.parentName);
    const heading = renderTargetOf(host).querySelector("h1");
    const childHost = renderTargetOf(host).querySelector(fixture.childName);
    // The server rendered two items (its store saw the same rule, but this
    // client's child store adds one more).
    renderTargetOf(childHost).querySelector("li:last-child").remove();
    const ul = renderTargetOf(childHost).querySelector("ul");

    fixture.define();

    const lis = [...renderTargetOf(childHost).querySelectorAll("li")];
    expect(lis.map((li) => li.textContent)).toEqual(["Hi 1", "Hi 2", "Hi 3"]);
    expect(childHost.shadowRoot.querySelectorAll("ul")).toHaveLength(1);
    expect(renderTargetOf(childHost).querySelector("ul")).not.toBe(ul);
    // The parent's own tree was still adopted.
    expect(renderTargetOf(host).querySelector("h1")).toBe(heading);
    expect(globalThis.__rtglSsr.hydrated).toBe(1);
    expect(globalThis.__rtglSsr.mismatched).toBe(1);
    expect(globalThis.__rtglSsr.reasons[0]).toMatch(/expected 3 child node\(s\), found 2/);
  });

  it("replaces a custom element that restructured its own children", () => {
    const wrapperName = `x-hyd-wrapper-${componentNumber++}`;
    // Like rtgl-popover: moves its children into a wrapper when connected.
    customElements.define(wrapperName, class extends HTMLElement {
      connectedCallback() {
        if (this.firstElementChild?.dataset.wrapper) return;
        const wrapper = document.createElement("div");
        wrapper.dataset.wrapper = "true";
        wrapper.append(...this.childNodes);
        this.append(wrapper);
      }
    });
    const name = `x-hyd-page-${componentNumber++}`;
    const config = {
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: {
        refs: {},
        styles: {},
        template: parse([
          { "p#intro": "Intro" },
          { [wrapperName]: [{ span: "a" }, { span: "b" }] },
        ]),
      },
      store: {},
      handlers: {},
    };
    serverRender(renderComponent({ component: name, components: [config] }).html);
    const host = document.querySelector(name);
    const intro = renderTargetOf(host).querySelector("p");
    const serverWrapper = renderTargetOf(host).querySelector(wrapperName);

    customElements.define(name, createComponent(config, {}));

    const wrapper = renderTargetOf(host).querySelector(wrapperName);
    expect(wrapper).not.toBe(serverWrapper);
    expect(wrapper.querySelectorAll("[data-wrapper]")).toHaveLength(1);
    expect([...wrapper.querySelectorAll("span")].map((s) => s.textContent)).toEqual(["a", "b"]);
    expect(host.shadowRoot.querySelectorAll(wrapperName)).toHaveLength(1);
    expect(renderTargetOf(host).querySelector("p")).toBe(intro);
  });

  it("corrects attributes and removes ones only the server wrote on plain elements", () => {
    const name = `x-hyd-attrs-${componentNumber++}`;
    const config = {
      schema: { componentName: name, propsSchema: { type: "object", properties: { tone: {} } } },
      view: { refs: {}, styles: {}, template: parse([{ "div#box data-tone=${tone}": "x" }]) },
      store: { selectViewData: ({ props }) => ({ tone: props.tone || "light" }) },
      handlers: {},
    };
    serverRender(renderComponent({ component: name, components: [config], props: { tone: "dark" } }).html);
    const host = document.querySelector(name);
    const box = renderTargetOf(host).querySelector("div");
    box.setAttribute("data-stale", "1");

    customElements.define(name, createComponent(config, {}));

    expect(renderTargetOf(host).querySelector("div")).toBe(box);
    expect(box.getAttribute("data-tone")).toBe("light");
    expect(box.hasAttribute("data-stale")).toBe(false);
    expect(globalThis.__rtglSsr.mismatched).toBe(1);
  });

  it("leaves attributes a custom element set on itself", () => {
    const flagName = `x-hyd-flag-${componentNumber++}`;
    customElements.define(flagName, class extends HTMLElement {
      connectedCallback() { this.setAttribute("has-label", ""); }
    });
    const name = `x-hyd-flagged-${componentNumber++}`;
    const config = {
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: { refs: {}, styles: {}, template: parse([{ [`${flagName} kind=a`]: null }]) },
      store: {},
      handlers: {},
    };
    serverRender(renderComponent({ component: name, components: [config] }).html);

    customElements.define(name, createComponent(config, {}));

    const flag = renderTargetOf(document.querySelector(name)).querySelector(flagName);
    expect(flag.hasAttribute("has-label")).toBe(true);
    expect(globalThis.__rtglSsr).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("still hydrates the parent when a child is defined first, and the child catches up", () => {
    const fixture = createFixture();
    serverRender(fixture.html({ title: "Hi", items: [1, 2] }));
    const host = document.querySelector(fixture.parentName);
    const heading = renderTargetOf(host).querySelector("h1");

    // The default order: the child upgrades before any props reach it.
    fixture.define([fixture.child, fixture.parent]);
    flushFrames();

    const childHost = renderTargetOf(host).querySelector(fixture.childName);
    expect(renderTargetOf(host).querySelector("h1")).toBe(heading);
    expect([...renderTargetOf(childHost).querySelectorAll("li")].map((li) => li.textContent))
      .toEqual(["Hi 1", "Hi 2"]);
    expect(childHost.shadowRoot.querySelectorAll("ul")).toHaveLength(1);
    expect(globalThis.__rtglSsr.mismatched).toBe(1);
  });

  it("renders normally when a marked host has nothing to adopt", () => {
    const name = `x-hyd-empty-${componentNumber++}`;
    const config = {
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: { refs: {}, styles: {}, template: parse([{ p: "Fresh" }]) },
      store: {},
      handlers: {},
    };
    document.body.innerHTML = `<${name} data-rtgl-hydrate=""></${name}>`;

    customElements.define(name, createComponent(config, {}));

    const host = document.querySelector(name);
    expect(renderTargetOf(host).textContent).toBe("Fresh");
    expect(host.hasAttribute("data-rtgl-hydrate")).toBe(false);
    expect(globalThis.__rtglSsr).toBeUndefined();
  });

  it("leaves unmarked components exactly as before", () => {
    const name = `x-hyd-plain-${componentNumber++}`;
    const config = {
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: { refs: {}, styles: {}, template: parse([{ p: "Client" }]) },
      store: {},
      handlers: {},
    };
    customElements.define(name, createComponent(config, {}));
    const host = document.body.appendChild(document.createElement(name));
    expect(renderTargetOf(host).textContent).toBe("Client");
    expect(globalThis.__rtglSsr).toBeUndefined();
  });
});
