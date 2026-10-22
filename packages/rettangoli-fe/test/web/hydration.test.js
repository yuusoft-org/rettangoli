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
  delete globalThis.__rtglHydration;
  vi.stubGlobal("requestAnimationFrame", (callback) => frames.push(callback));
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  delete globalThis.__rtglHydration;
});

describe("hydrating prerendered components", () => {
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
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 2, mismatched: 0, reasons: [] });
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
    host.items = [2];

    fixture.define();

    const childHost = renderTargetOf(host).querySelector(fixture.childName);
    expect([...renderTargetOf(childHost).querySelectorAll("li")].map((li) => li.textContent))
      .toEqual(["Hi 2"]);
    expect(childHost.shadowRoot.querySelectorAll("li")).toHaveLength(1);
    expect(globalThis.__rtglHydration.mismatched).toBeGreaterThan(0);
    expect(globalThis.__rtglHydration.reasons.join("\n")).toContain("text differs");
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
    expect(globalThis.__rtglHydration.hydrated).toBe(1);
    expect(globalThis.__rtglHydration.mismatched).toBe(1);
    expect(globalThis.__rtglHydration.reasons[0]).toMatch(/expected 3 child node\(s\), found 2/);
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
    expect(globalThis.__rtglHydration.mismatched).toBe(1);
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
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
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
    expect(globalThis.__rtglHydration.mismatched).toBe(1);
  });

  it("counts a marked host with an empty render target as a mismatch when the client draws more", () => {
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
    expect(globalThis.__rtglHydration.hydrated).toBe(0);
    expect(globalThis.__rtglHydration.mismatched).toBe(1);
    expect(globalThis.__rtglHydration.reasons[0]).toMatch(/expected 1 child node\(s\), found 0/);
  });

  it("counts a host that rendered nothing on both sides as hydrated", () => {
    const name = uniqueName("empty-both");
    const config = component({
      name,
      template: [{ "$if loaded": [{ p: "Loaded" }] }],
      store: { selectViewData: () => ({ loaded: false }) },
    });
    serverRender(renderComponent({ component: name, components: [config] }).html);
    expect(renderTargetOf(document.querySelector(name)).childNodes).toHaveLength(0);

    customElements.define(name, createComponent(config, {}));

    expect(globalThis.__rtglHydration).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("counts a host whose client draws content over an empty prerender as a mismatch", () => {
    const name = uniqueName("empty-differs");
    let loaded = false;
    const config = component({
      name,
      template: [{ "$if loaded": [{ p: "Loaded" }] }],
      store: { selectViewData: () => ({ loaded }) },
    });
    serverRender(renderComponent({ component: name, components: [config] }).html);
    // The browser sees a value the build didn't, such as a stored setting.
    loaded = true;

    customElements.define(name, createComponent(config, {}));

    expect(renderTargetOf(document.querySelector(name)).textContent).toBe("Loaded");
    expect(globalThis.__rtglHydration.mismatched).toBe(1);
  });

  it("assigns props to undefined custom elements as before on a page with no prerendered markup", () => {
    const name = `x-hyd-plain-undefined-${componentNumber++}`;
    const textName = `x-later-text-${componentNumber}`;
    const panelName = `x-later-panel-${componentNumber}`;
    const config = {
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: {
        refs: {},
        styles: {},
        template: parse([
          { [`${textName} style="color: red"`]: "Hello" },
          { [`${panelName} :hidden=\${hide} :title=\${tip}`]: "Panel" },
        ]),
      },
      store: { selectViewData: () => ({ hide: true, tip: "Tooltip" }) },
      handlers: {},
    };
    customElements.define(name, createComponent(config, {}));
    const host = document.body.appendChild(document.createElement(name));
    const text = renderTargetOf(host).querySelector(textName);
    const panel = renderTargetOf(host).querySelector(panelName);

    expect(typeof text.style).toBe("object");
    expect(text.style.color).toBe("red");
    expect(panel.hasAttribute("hidden")).toBe(true);
    expect(panel.getAttribute("title")).toBe("Tooltip");

    // Defined later, it can use its native style.
    let error = null;
    customElements.define(textName, class extends HTMLElement {
      connectedCallback() {
        try {
          this.style.overflow = "hidden";
        } catch (caught) {
          error = caught;
        }
      }
    });
    renderTargetOf(host).append(text);
    expect(error).toBeNull();
    expect(text.style.overflow).toBe("hidden");
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
    expect(globalThis.__rtglHydration).toBeUndefined();
  });
});

// Components for the cases below: `name` is unique per test, `template` raw.
const component = ({ name, props = [], template, store = {}, handlers = {}, ssr }) => ({
  schema: {
    componentName: name,
    propsSchema: {
      type: "object",
      properties: Object.fromEntries(props.map((prop) => [prop, {}])),
    },
    ...(ssr === undefined ? {} : { ssr }),
  },
  view: { refs: {}, styles: {}, template: parse(template) },
  store,
  handlers,
});

const uniqueName = (prefix) => `x-${prefix}-${componentNumber++}`;

describe("hydration edge cases", () => {
  it("passes props named like native properties to children as values", () => {
    const parentName = uniqueName("native-parent");
    const childName = uniqueName("native-child");
    const meta = { text: "From an object" };
    const parent = component({
      name: parentName,
      template: [{ [`${childName} :title=\${meta} :hidden=\${hidden}`]: null }],
      store: { selectViewData: () => ({ meta, hidden: false }) },
    });
    const child = component({
      name: childName,
      props: ["title", "hidden"],
      template: [{ p: "${text} ${hiddenText}" }],
      store: {
        selectViewData: ({ props }) => ({
          text: props.title?.text ?? String(props.title),
          hiddenText: String(props.hidden),
        }),
      },
    });
    serverRender(renderComponent({ component: parentName, components: [parent, child] }).html);

    [parent, child].forEach((config) =>
      customElements.define(config.schema.componentName, createComponent(config, {})));

    const host = document.querySelector(parentName);
    const childHost = renderTargetOf(host).querySelector(childName);
    expect(childHost.props.title).toBe(meta);
    expect(childHost.props.hidden).toBe(false);
    expect(childHost.hasAttribute("title")).toBe(false);
    expect(childHost.hasAttribute("hidden")).toBe(false);
    expect(renderTargetOf(childHost).textContent).toBe("From an object false");
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 2, mismatched: 0, reasons: [] });
  });

  it("gives a child attribute-form props and props it doesn't declare through the native setters", () => {
    const parentName = uniqueName("release-parent");
    const childName = uniqueName("release-child");
    const parent = component({
      name: parentName,
      template: [{ [`${childName} style="color: red" :hidden=\${hidden} :label=\${label}`]: null }],
      store: { selectViewData: () => ({ hidden: true, label: "Kept" }) },
    });
    const child = component({
      name: childName,
      props: ["label"],
      template: [{ p: "${label}" }],
      store: { selectViewData: ({ props }) => ({ label: props.label }) },
    });
    serverRender(renderComponent({ component: parentName, components: [parent, child] }).html);

    [parent, child].forEach((config) =>
      customElements.define(config.schema.componentName, createComponent(config, {})));

    const childHost = renderTargetOf(document.querySelector(parentName)).querySelector(childName);
    expect(typeof childHost.style).toBe("object");
    expect(childHost.style.color).toBe("red");
    expect(Object.hasOwn(childHost, "style")).toBe(false);
    expect(childHost.hidden).toBe(true);
    expect(childHost.hasAttribute("hidden")).toBe(true);
    expect(Object.hasOwn(childHost, "hidden")).toBe(false);
    expect(renderTargetOf(childHost).textContent).toBe("Kept");
  });

  it("keeps camelCase attributes on plain elements", () => {
    const name = uniqueName("camel");
    const config = component({
      name,
      template: [{ "div#box tabIndex=0": [{ "input#field maxLength=5": null }] }],
    });
    serverRender(renderComponent({ component: name, components: [config] }).html);

    customElements.define(name, createComponent(config, {}));

    const target = renderTargetOf(document.querySelector(name));
    expect(target.querySelector("div").getAttribute("tabindex")).toBe("0");
    expect(target.querySelector("input").getAttribute("maxlength")).toBe("5");
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("adopts text the HTML parser joined", () => {
    const name = uniqueName("text-run");
    const config = component({
      name,
      template: [
        { "p#greeting": ["Hello ", "${who}", "!"] },
        { "p#items": [{ "$for item in items": ["${item}"] }] },
        { "p#empty": ["", "${nothing}"] },
      ],
      store: {
        selectViewData: () => ({ who: "Ada", items: ["a", "b", "c"], nothing: "" }),
      },
    });
    serverRender(renderComponent({ component: name, components: [config] }).html);
    const greeting = renderTargetOf(document.querySelector(name)).querySelector("#greeting");

    customElements.define(name, createComponent(config, {}));

    const target = renderTargetOf(document.querySelector(name));
    expect(target.querySelector("#greeting")).toBe(greeting);
    expect(greeting.textContent).toBe("Hello Ada!");
    expect(target.querySelector("#items").textContent).toBe("abc");
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("adopts the light DOM a parent gives an ssr: false child", () => {
    const parentName = uniqueName("opt-parent");
    const childName = uniqueName("opt-child");
    const parent = component({
      name: parentName,
      template: [{ [childName]: [{ "span#slotted": "Slotted" }] }],
    });
    const child = component({
      name: childName,
      ssr: false,
      template: [{ "div#own": "Client only" }],
    });
    serverRender(renderComponent({ component: parentName, components: [parent, child] }).html);
    const slotted = renderTargetOf(document.querySelector(parentName)).querySelector("#slotted");

    [parent, child].forEach((config) =>
      customElements.define(config.schema.componentName, createComponent(config, {})));

    const childHost = renderTargetOf(document.querySelector(parentName)).querySelector(childName);
    expect(childHost.querySelector("#slotted")).toBe(slotted);
    expect(renderTargetOf(childHost).textContent).toBe("Client only");
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("gives an ssr: false root its serialized props", () => {
    const name = uniqueName("opt-root");
    const config = component({
      name,
      ssr: false,
      props: ["route"],
      template: [{ p: "${route}" }],
      store: { selectViewData: ({ props }) => ({ route: props.route }) },
    });
    document.body.innerHTML = renderComponent({
      component: name,
      components: [config],
      props: { route: "/from-server" },
      serializeProps: true,
    }).html;

    customElements.define(name, createComponent(config, {}));

    const host = document.querySelector(name);
    expect(renderTargetOf(host).textContent).toBe("/from-server");
    expect(host.hasAttribute("data-rtgl-props")).toBe(false);
    expect(host.querySelector("script")).toBeNull();
  });

  it("renders a root from its serialized props over an attribute, as the server did", () => {
    const name = uniqueName("precedence");
    const config = component({
      name,
      props: ["label"],
      template: [{ p: "${label}" }],
      store: { selectViewData: ({ props }) => ({ label: props.label }) },
    });
    serverRender(renderComponent({
      component: name,
      components: [config],
      props: { label: "From props" },
      attributes: { label: "From attribute" },
      serializeProps: true,
    }).html);

    customElements.define(name, createComponent(config, {}));

    expect(renderTargetOf(document.querySelector(name)).textContent).toBe("From props");
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("keeps reading a root prop the build took from an attribute from that attribute", () => {
    const name = uniqueName("attribute-root");
    const config = component({
      name,
      props: ["mode"],
      template: [{ p: "${mode}" }],
      store: { selectViewData: ({ props }) => ({ mode: props.mode }) },
    });
    serverRender(renderComponent({
      component: name,
      components: [config],
      attributes: { mode: "dark" },
      serializeProps: true,
    }).html);

    customElements.define(name, createComponent(config, {}));

    const host = document.querySelector(name);
    expect(renderTargetOf(host).textContent).toBe("dark");
    expect(globalThis.__rtglHydration).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
    host.setAttribute("mode", "light");
    expect(host.props.mode).toBe("light");
  });

  it("still notices a prop changed in place after its child was adopted", () => {
    const parentName = uniqueName("snapshot-parent");
    const childName = uniqueName("snapshot-child");
    const shared = { items: ["a"] };
    const parent = component({
      name: parentName,
      template: [{ [`${childName} :list=\${shared}`]: null }],
      store: { selectViewData: () => ({ shared }) },
    });
    const child = component({
      name: childName,
      props: ["list"],
      template: [{ p: "${count}" }],
      store: { selectViewData: ({ props }) => ({ count: String(props.list?.items.length ?? 0) }) },
    });
    serverRender(renderComponent({ component: parentName, components: [parent, child] }).html);
    [parent, child].forEach((config) =>
      customElements.define(config.schema.componentName, createComponent(config, {})));
    const host = document.querySelector(parentName);
    const childHost = renderTargetOf(host).querySelector(childName);

    shared.items.push("b");
    host.render();
    flushFrames();

    expect(renderTargetOf(childHost).textContent).toBe("2");
  });

  it("gives a child that rendered before its parent its props without reporting a change", () => {
    const parentName = uniqueName("early-parent");
    const childName = uniqueName("early-child");
    const handleOnUpdate = vi.fn();
    const parent = component({
      name: parentName,
      template: [{ [`${childName} :label=\${label}`]: null }],
      store: { selectViewData: () => ({ label: "Ready" }) },
    });
    const child = component({
      name: childName,
      props: ["label"],
      template: [{ p: "${label}" }],
      store: { selectViewData: ({ props }) => ({ label: props.label ?? "" }) },
      handlers: { handleOnUpdate },
    });
    serverRender(renderComponent({ component: parentName, components: [parent, child] }).html);

    [child, parent].forEach((config) =>
      customElements.define(config.schema.componentName, createComponent(config, {})));
    flushFrames();

    const childHost = renderTargetOf(document.querySelector(parentName)).querySelector(childName);
    expect(renderTargetOf(childHost).textContent).toBe("Ready");
    expect(handleOnUpdate).not.toHaveBeenCalled();
  });

  it("removes classes only the server wrote on plain elements", () => {
    const name = uniqueName("classes");
    const config = component({ name, template: [{ "div#box.card": "x" }] });
    serverRender(renderComponent({ component: name, components: [config] }).html);
    const box = renderTargetOf(document.querySelector(name)).querySelector("div");
    box.classList.add("stale");

    customElements.define(name, createComponent(config, {}));

    expect(renderTargetOf(document.querySelector(name)).querySelector("div")).toBe(box);
    expect(box.className).toBe("card");
    expect(globalThis.__rtglHydration.mismatched).toBe(1);
  });

  it("recovers when the hydrating patch throws, with one tree", () => {
    const name = uniqueName("throws");
    const brokenName = uniqueName("setter");
    let throws = true;
    customElements.define(brokenName, class extends HTMLElement {
      set value(next) {
        if (throws) {
          throws = false;
          throw new Error("first assignment fails");
        }
        this.received = next;
      }
    });
    const config = component({
      name,
      template: [{ "p#before": "Before" }, { [`${brokenName} :value=\${value}`]: null }],
      store: { selectViewData: () => ({ value: 1 }) },
    });
    serverRender(renderComponent({ component: name, components: [config] }).html);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    customElements.define(name, createComponent(config, {}));
    const host = document.querySelector(name);
    expect(renderTargetOf(host).childNodes).toHaveLength(0);
    flushFrames();

    expect(host.shadowRoot.querySelectorAll("p")).toHaveLength(1);
    expect(renderTargetOf(host).querySelector(brokenName).received).toBe(1);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("drops the server's copy of the styles once the adopted sheets hold them", () => {
    const name = uniqueName("styles");
    const config = component({ name, template: [{ p: "Styled" }] });
    serverRender(renderComponent({ component: name, components: [config] }).html);
    const host = document.querySelector(name);
    const hasStyle = () =>
      [...host.shadowRoot.children].some((node) => node.localName === "style");
    expect(hasStyle()).toBe(true);

    customElements.define(name, createComponent(config, {}));

    expect(hasStyle()).toBe(false);
  });

  it("keeps at most a hundred mismatch reasons", () => {
    const name = uniqueName("reasons");
    const items = Array.from({ length: 150 }, (_, index) => `item ${index}`);
    const config = component({
      name,
      template: [{ ul: [{ "$for item, i in items": [{ "li#row${i}": "${item}" }] }] }],
      store: { selectViewData: () => ({ items }) },
    });
    serverRender(renderComponent({ component: name, components: [config] }).html);
    renderTargetOf(document.querySelector(name))
      .querySelectorAll("li")
      .forEach((li) => {
        li.textContent = "changed";
      });

    customElements.define(name, createComponent(config, {}));

    expect(globalThis.__rtglHydration.mismatched).toBe(1);
    expect(globalThis.__rtglHydration.reasons).toHaveLength(100);
  });

  it("renders without props when the serialized props can't be read", () => {
    const name = uniqueName("bad-props");
    const config = component({
      name,
      props: ["label"],
      template: [{ p: "${label}" }],
      store: { selectViewData: ({ props }) => ({ label: props.label ?? "none" }) },
    });
    document.body.innerHTML = `<${name} data-rtgl-props=""><script type="application/json" data-rtgl-props="">{bad</script></${name}>`;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    customElements.define(name, createComponent(config, {}));

    expect(renderTargetOf(document.querySelector(name)).textContent).toBe("none");
    expect(errors).toHaveBeenCalledWith(
      expect.stringContaining("has unreadable prerendered props"),
      expect.any(Error),
    );
    errors.mockRestore();
  });
});
