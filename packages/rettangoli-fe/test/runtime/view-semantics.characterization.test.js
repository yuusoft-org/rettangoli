// @vitest-environment jsdom
/**
 * Records how `parseView` turns view templates into vnodes (keys, ids, classes,
 * attribute and property bindings, ref wiring) and what that does in the DOM.
 * Consumers read these vnodes (`data.key`, `data.attrs`, `data.on`), and apps
 * depend on the quirks below, so each is pinned as it behaves today. A test
 * marked "known quirk" documents a verified bug; the change that fixes it
 * flips the assertion in a reviewed test diff.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import { h } from "snabbdom/build/h.js";
import createComponent from "../../src/createComponent.js";
import createWebPatch from "../../src/createWebPatch.js";
import { parseView } from "../../src/parser.js";
import { collectRefElements } from "../../src/core/runtime/refs.js";
import { renderComponent } from "../../src/server/index.js";

const view = (template, { viewData = {}, refs = {}, handlers = {} } = {}) =>
  parseView({ h, template: parse(template), viewData, refs, handlers });

const nodeOf = (template, options) => view([{ [template]: "" }], options).children[0];

const collectKeys = (vnode) => [
  ...(vnode.data?.key !== undefined ? [vnode.data.key] : []),
  ...(vnode.children || []).flatMap((child) => (typeof child === "object" ? collectKeys(child) : [])),
];
const keysOf = (template, viewData) => view(template, { viewData }).children.flatMap(collectKeys);

describe("vnode keys", () => {
  it("uses the element id as the key", () => {
    expect(keysOf([{ "div#main.x": [{ "span#inner": "x" }] }])).toEqual(["main", "inner"]);
  });

  it("keys elements without an id as `${selector}-${path}` with the tree position as path", () => {
    expect(keysOf([
      { "div.a": [{ span: "x" }, { "p.b": "y" }] },
      { section: [{ div: [{ i: "z" }] }] },
    ])).toEqual(["div.a-0", "span-0.0", "p.b-0.1", "section-1", "div-1.0", "i-1.0.0"]);
  });

  it("keeps the whole selector, classes included, in the key", () => {
    expect(nodeOf("div.a.b").data.key).toBe("div.a.b-0");
  });

  it("known quirk: paths count the flattened siblings, so $if and $for shift later keys", () => {
    const template = [{ "$if show": [{ span: "a" }, { span: "b" }] }, { p: "tail" }];
    expect(keysOf(template, { show: true })).toEqual(["span-0", "span-1", "p-2"]);
    expect(keysOf(template, { show: false })).toEqual(["p-0"]);

    const loop = [{ "$for item in items": [{ li: "${item}" }] }, { p: "tail" }];
    expect(keysOf(loop, { items: [1, 2] })).toEqual(["li-0", "li-1", "p-2"]);
    expect(keysOf(loop, { items: [] })).toEqual(["p-0"]);
  });

  it("keeps nested paths flattened across $if and $for inside one parent", () => {
    const template = [{
      div: [
        { "$if open": [{ b: "1" }] },
        { "$for x in xs": [{ i: "${x}" }] },
        { s: "2" },
      ],
    }];
    expect(keysOf(template, { open: true, xs: [1, 2] })).toEqual(["div-0", "b-0.0", "i-0.1", "i-0.2", "s-0.3"]);
    expect(keysOf(template, { open: false, xs: [] })).toEqual(["div-0", "s-0.0"]);
  });

  it("known quirk: ids repeated by a loop produce duplicate keys", () => {
    const keys = keysOf([{ "$for n in items": [{ "li#row": "${n}" }] }, { p: "tail" }], { items: [1, 2, 3] });
    expect(keys).toEqual(["row", "row", "row", "p-3"]);
  });
});

describe("classes", () => {
  const classesOf = (selector, viewData) => {
    const { attrs, class: classObject, props } = nodeOf(selector, { viewData }).data;
    return { attrs: attrs?.class, class: classObject && Object.keys(classObject), props: props?.class };
  };

  it("puts selector classes in data.class", () => {
    expect(classesOf("div.a.b")).toEqual({ attrs: undefined, class: ["a", "b"], props: undefined });
  });

  it("merges selector classes first, then class= classes, without duplicates", () => {
    expect(classesOf('div.a class="b c"')).toEqual({ attrs: "a b c", class: ["a"], props: undefined });
    expect(classesOf('div.a.b class="b c"')).toEqual({ attrs: "a b c", class: ["a", "b"], props: undefined });
    expect(classesOf("div.a class=${c}", { c: "z a y" })).toEqual({ attrs: "a z y", class: ["a"], props: undefined });
  });

  it("keeps only class= when there are no selector classes", () => {
    expect(classesOf('div class="x y"')).toEqual({ attrs: "x y", class: undefined, props: undefined });
  });

  it("mirrors the merged class into props on a custom element", () => {
    expect(classesOf('x-w.a class="b c"')).toEqual({ attrs: "a b c", class: ["a"], props: "a b c" });
    expect(classesOf("x-w.a")).toEqual({ attrs: undefined, class: ["a"], props: undefined });
  });
});

describe("id precedence", () => {
  const refs = {
    a: { eventListeners: { click: { handler: "handleA" } } },
    b: { eventListeners: { click: { handler: "handleB" } } },
  };

  // Patch into real DOM, then read the three things apps see: the DOM id, the
  // vnode key, and the keys of el.refIds (from the patched vnode tree).
  const observe = (selector, viewData = {}) => {
    const called = [];
    const handlers = { handleA: () => called.push("a"), handleB: () => called.push("b") };
    const vnode = view([{ [selector]: "" }], { viewData, refs, handlers });
    const host = document.createElement("div");
    const patched = createWebPatch()(host, vnode);
    const node = vnode.children[0];
    const refIds = collectRefElements({ rootVNode: patched, refs });
    node.data.on?.click?.({ currentTarget: {}, target: {}, preventDefault() {}, stopPropagation() {} });
    return {
      domId: node.elm.id,
      key: node.data.key,
      refIds: Object.keys(refIds),
      wiredRefs: called,
      elementIsRefId: Object.values(refIds).every((element) => element === node.elm),
    };
  };

  it("uses the selector id alone", () => {
    expect(observe("div#a")).toEqual({
      domId: "a", key: "a", refIds: ["a"], wiredRefs: ["a"], elementIsRefId: true,
    });
  });

  it("uses id= alone", () => {
    expect(observe("div id=b")).toEqual({
      domId: "b", key: "b", refIds: ["b"], wiredRefs: ["b"], elementIsRefId: true,
    });
  });

  // Until the id-precedence fix, the DOM got the selector id here (domId "a",
  // refIds ["a"]) while the key and the wired ref used b.
  it("for a plain element with both, id= wins everywhere", () => {
    expect(observe("div#a id=b")).toEqual({
      domId: "b", key: "b", refIds: ["b"], wiredRefs: ["b"], elementIsRefId: true,
    });
  });

  it("for a custom element with both, id= wins everywhere", () => {
    expect(observe("x-w#a id=b")).toEqual({
      domId: "b", key: "b", refIds: ["b"], wiredRefs: ["b"], elementIsRefId: true,
    });
  });

  // An empty id= (written out, bare, or an undefined interpolation) is an own
  // `id` attribute with no value. Pinned as is; the last three rows must not
  // change when id precedence is fixed.
  it.each([
    ["div#a id=\"\"", "div#a-0", "a"],
    ["div#a id", "div#a-0", "a"],
    ["div#a id=${nothing}", "div#a-0", "a"],
  ])("plain element %s: no key from the id, selector id in the DOM", (selector, key, domId) => {
    expect(observe(selector, { nothing: undefined })).toEqual({
      domId, key, refIds: ["a"], wiredRefs: [], elementIsRefId: true,
    });
  });

  it.each([
    ["x-w#a id=\"\"", "x-w#a-0"],
    ["x-w#a id", "x-w#a-0"],
    ["x-w#a id=${nothing}", "x-w#a-0"],
  ])("custom element %s: an empty id wipes the selector id", (selector, key) => {
    expect(observe(selector, { nothing: undefined })).toEqual({
      domId: "", key, refIds: [], wiredRefs: [], elementIsRefId: true,
    });
  });

  it.each(['div id=""', "div id", "div id=${nothing}"])(
    "plain element without a selector id, %s: blank id, no ref",
    (selector) => {
      expect(observe(selector, { nothing: undefined })).toEqual({
        domId: "", key: "div-0", refIds: [], wiredRefs: [], elementIsRefId: true,
      });
    },
  );
});

describe("?attr toggles", () => {
  const toggled = (value) => {
    const viewData = { value, flag: "yes", name: "flag" };
    const plain = nodeOf("div ?on=${value}", { viewData });
    const component = nodeOf("x-w ?on=${value}", { viewData });
    return { attr: plain.data.attrs?.on, prop: component.data.props?.on };
  };

  // The binding's value is interpolated first and the resulting string is then
  // read as a literal or as a path into the view data (known quirk). Only true,
  // "true", and strings that name a truthy view-data path turn it on.
  it.each([
    [true, ""], ["true", ""],
    [false, undefined], ["false", undefined], ["", undefined],
    ["yes", undefined], [1, undefined], [0, undefined],
    [null, undefined], [undefined, undefined], [{}, undefined], [[], undefined],
  ])("?on=${value} with %j sets the attribute to %j", (value, attr) => {
    expect(toggled(value).attr).toBe(attr);
    expect(toggled(value).prop).toBe(attr === "");
  });

  it("reads a literal path string from the view data", () => {
    const viewData = { flag: "yes", empty: "", name: "flag" };
    expect(nodeOf("div ?on=flag", { viewData }).data.attrs).toEqual({ on: "" });
    expect(nodeOf("div ?on=empty", { viewData }).data.attrs).toBeUndefined();
    expect(nodeOf("div ?on=missing", { viewData }).data.attrs).toBeUndefined();
    expect(nodeOf("x-w ?on=flag", { viewData }).data.props).toEqual({ on: true });
    expect(nodeOf("x-w ?on=missing", { viewData }).data.props).toEqual({ on: false });
  });

  it("known quirk: an interpolated string that names another view-data key is followed", () => {
    expect(nodeOf("div ?on=${name}", { viewData: { name: "flag", flag: "yes" } }).data.attrs).toEqual({ on: "" });
    expect(nodeOf("div ?on=${name}", { viewData: { name: "flag", flag: "" } }).data.attrs).toBeUndefined();
  });

  it("literals true/false/empty and a bare ?name", () => {
    expect(nodeOf("div ?on=true").data.attrs).toEqual({ on: "" });
    expect(nodeOf("div ?on=false").data.attrs).toBeUndefined();
    expect(nodeOf('div ?on=""').data.attrs).toBeUndefined();
    expect(nodeOf("div ?on").data.attrs).toEqual({ on: "" });
    expect(nodeOf("x-w ?on").data.props).toEqual({ on: true });
    expect(nodeOf("x-w ?on=false").data.props).toEqual({ on: false });
  });

  it("rejects value-carrying attributes as toggles", () => {
    expect(() => nodeOf("div ?aria-label=true")).toThrow(/Invalid boolean attribute '\?aria-label'/);
    expect(() => nodeOf("div ?data-x=true")).toThrow(/Invalid boolean attribute '\?data-x'/);
    expect(() => nodeOf("div ?role=true")).toThrow(/Invalid boolean attribute '\?role'/);
  });
});

describe(":prop bindings", () => {
  it("passes paths by reference and literals as typed values", () => {
    const viewData = { obj: { k: 1 }, list: [1], str: "true" };
    const { props, attrs } = nodeOf(
      "x-w :a=${obj} :b=${missing} :c=${true} :d=${false} :e=${null} :f=${12} :g=${-1.5e3} :h=${undefined} :i=${list} :j=${obj.k} :s=${str}",
      { viewData },
    ).data;
    expect(Object.keys(props)).toEqual(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "s"]);
    expect(props).toEqual({
      a: { k: 1 },
      b: undefined,
      c: true,
      d: false,
      e: null,
      f: 12,
      g: -1500,
      h: undefined,
      i: [1],
      j: 1,
      s: "true",
    });
    expect(props.a).toBe(viewData.obj);
    expect(props.i).toBe(viewData.list);
    expect(attrs).toBeUndefined();
  });

  it("camel-cases kebab names and resolves loop variables", () => {
    const items = [{ n: 1 }, { n: 2 }];
    const nodes = view(
      [{ "$for it in items": [{ "x-w :kebab-name=${it}": "" }] }],
      { viewData: { items } },
    ).children;
    expect(nodes.map((node) => node.data.props)).toEqual([{ kebabName: items[0] }, { kebabName: items[1] }]);
    expect(nodes[0].data.props.kebabName).toBe(items[0]);
  });

  it("sets props on a plain element too, with no attribute", () => {
    const { props, attrs } = nodeOf("div :a=${obj}", { viewData: { obj: { k: 1 } } }).data;
    expect(props).toEqual({ a: { k: 1 } });
    expect(attrs).toBeUndefined();
  });

  it("mirrors attribute-form bindings into props only on custom elements", () => {
    const component = nodeOf("x-w a=1 b=${v} c", { viewData: { v: "str" } }).data;
    expect(component.attrs).toEqual({ a: "1", b: "str", c: "" });
    expect(component.props).toEqual({ a: "1", b: "str", c: true });
    const plain = nodeOf("div a=1 b=${v} c", { viewData: { v: "str" } }).data;
    expect(plain.attrs).toEqual({ a: "1", b: "str", c: "" });
    expect(plain.props).toBeUndefined();
  });

  it("rejects property bindings that are not a bare ${value}", () => {
    const message = /Property-form bindings must use ':prop=\$\{value\}' syntax\. Found ':a=lit' in 'x-w :a=lit'\./;
    expect(() => nodeOf("x-w :a=lit")).toThrow(message);
    expect(() => nodeOf('x-w :a="${obj}"')).toThrow(/Property-form bindings must use ':prop=\$\{value\}' syntax\./);
  });
});

describe("attribute values", () => {
  it.each([
    'A "quoted" name',
    "a=b c=d",
    "100% / %20",
    "line one\nline two",
    "${notEvaluated}",
    "",
  ])("keeps %j as one attribute and prop value", (value) => {
    const { attrs, props } = nodeOf('x-w title=${v} data-x="pre ${v} post" plain=lit', {
      viewData: { v: value, notEvaluated: "NO" },
    }).data;
    expect(attrs).toEqual({ title: value, "data-x": `pre ${value} post`, plain: "lit" });
    expect(props).toEqual({ title: value, dataX: `pre ${value} post`, plain: "lit" });
  });
});

describe("ref matching", () => {
  const listener = (key) => ({ eventListeners: { click: { handler: `handle:${key}` } } });
  const wiredRef = (selector, refKeys) => {
    const called = [];
    const refs = Object.fromEntries(refKeys.map((key) => [key, listener(key)]));
    const handlers = Object.fromEntries(refKeys.map((key) => [`handle:${key}`, () => called.push(key)]));
    nodeOf(selector, { refs, handlers }).data.on?.click?.({});
    return called;
  };

  it("prefers an id ref over a class ref, wildcard or not, whatever the declaration order", () => {
    expect(wiredRef("div#save.btn", ["save", ".btn"])).toEqual(["save"]);
    expect(wiredRef("div#save.btn", [".btn", "save"])).toEqual(["save"]);
    expect(wiredRef("div#rowOne.x", ["row*", ".x"])).toEqual(["row*"]);
  });

  it("prefers an exact ref over a wildcard ref", () => {
    expect(wiredRef("div#rowOne", ["row*", "rowOne"])).toEqual(["rowOne"]);
    expect(wiredRef("div#rowOne", ["rowOne", "row*"])).toEqual(["rowOne"]);
    expect(wiredRef("div.btnPrimary", [".btn*", ".btnPrimary"])).toEqual([".btnPrimary"]);
  });

  it("prefers the longest wildcard prefix", () => {
    expect(wiredRef("div#rowOneTwo", ["row*", "rowOne*", "r*"])).toEqual(["rowOne*"]);
    expect(wiredRef("div.btn-primary", [".btn*", ".btn-p*"])).toEqual([".btn-p*"]);
  });

  it("breaks a full tie by declaration order", () => {
    expect(wiredRef("div.a.b", [".a", ".b"])).toEqual([".a"]);
    expect(wiredRef("div.a.b", [".b", ".a"])).toEqual([".b"]);
  });

  it("matches classes from the class attribute and wires nothing when no ref matches", () => {
    expect(wiredRef('div class="btn"', [".btn"])).toEqual([".btn"]);
    expect(wiredRef("div#other", ["row*"])).toEqual([]);
  });

  it("wires event types in the order the ref declares them", () => {
    const refs = {
      b: { eventListeners: { zeta: { handler: "handle" }, alpha: { handler: "handle" }, click: { handler: "handle" } } },
    };
    const { on } = nodeOf("button#b", { refs, handlers: { handle: () => {} } }).data;
    expect(Object.keys(on)).toEqual(["zeta", "alpha", "click"]);
  });
});

describe("listener options", () => {
  const createEvent = ({ target, currentTarget }) => ({
    type: "click",
    target,
    currentTarget,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  });
  const listenerFor = (eventConfig, handler = vi.fn()) => ({
    handler,
    click: nodeOf("button#b", {
      refs: { b: { eventListeners: { click: { handler: "handle", ...eventConfig } } } },
      handlers: { handle: handler },
    }).data.on.click,
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks targetOnly before once, so a rejected event does not use up once", () => {
    const { click, handler } = listenerFor({ once: true, targetOnly: true });
    const button = {};
    click(createEvent({ target: {}, currentTarget: button }));
    expect(handler).not.toHaveBeenCalled();
    click(createEvent({ target: button, currentTarget: button }));
    click(createEvent({ target: button, currentTarget: button }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not touch the event when targetOnly rejects it", () => {
    const { click } = listenerFor({ targetOnly: true, preventDefault: true, stopPropagation: true });
    const event = createEvent({ target: {}, currentTarget: {} });
    click(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it("calls preventDefault and stopPropagation before a debounced handler runs", () => {
    vi.useFakeTimers();
    const { click, handler } = listenerFor({ debounce: 20, preventDefault: true, stopPropagation: true });
    const target = {};
    const event = createEvent({ target, currentTarget: target });
    click(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("event payloads", () => {
  let payloadComponentNumber = 0;

  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
    vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  const mountPayloadComponent = () => {
    const name = `x-payload-pin-${payloadComponentNumber++}`;
    const received = { action: [], handler: [] };
    const when = new Date(0);
    const item = { "$if flag": { extra: 1 }, keep: 2, "$if other": { more: 1 } };
    const payload = { when: "${when}", item: "${item}", plain: "p", count: "${count}" };
    customElements.define(name, createComponent({
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: {
        template: parse([{ "button#viaAction": "A" }, { "button#viaHandler": "H" }]),
        refs: {
          viaAction: { eventListeners: { click: { action: "record", payload } } },
          viaHandler: { eventListeners: { click: { handler: "handleRecord", payload } } },
        },
        styles: {},
      },
      store: {
        selectViewData: () => ({ when, item, count: 7 }),
        record: (_context, received_) => { received.action.push(received_); },
      },
      handlers: { handleRecord: (_deps, received_) => { received.handler.push(received_); } },
    }, {}));
    const el = document.body.appendChild(document.createElement(name));
    el.shadowRoot.querySelector("#viaHandler").click();
    el.shadowRoot.querySelector("#viaAction").click();
    return { received, when, item };
  };

  it("hands a handler: the rendered payload plus the live event, values by reference", () => {
    const { received, when, item } = mountPayloadComponent();
    const [payload] = received.handler;
    expect(Object.keys(payload)).toEqual(["when", "item", "plain", "count", "_event"]);
    expect(payload._event).toBeInstanceOf(Event);
    expect(payload.when).toBe(when);
    expect(payload.item).toBe(item);
    expect(payload.count).toBe(7);
  });

  it("hands an action the same payload, with plain data copied and _action added", () => {
    const { received, when, item } = mountPayloadComponent();
    const [payload] = received.action;
    expect(Object.keys(payload)).toEqual(["when", "item", "plain", "count", "_event", "_action"]);
    expect(payload._action).toBe("record");
    expect(payload._event).toBeInstanceOf(Event);
    expect(payload.when).toBe(when);
    // `$if` keys inside data are kept as data.
    expect(payload.item).toEqual(item);
    expect(payload.item).not.toBe(item);
    expect(payload.plain).toBe("p");
    expect(payload.count).toBe(7);
  });
});

describe("hydrating attributes that a custom element sets on itself", () => {
  let componentNumber = 0;
  let frames;

  // jsdom does not parse declarative shadow roots; attach them the way a
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

  const hydrate = ({ template, serverData, clientData, selfSet }) => {
    const childName = `x-self-set-${componentNumber++}`;
    const name = `x-self-host-${componentNumber++}`;
    let side = "server";
    const config = {
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: { refs: {}, styles: {}, template: parse(template(childName)) },
      store: { selectViewData: () => (side === "server" ? serverData : clientData) },
      handlers: {},
    };
    document.body.innerHTML = renderComponent({ component: name, components: [config] }).html;
    attachDeclarativeShadowRoots(document.body);
    side = "client";
    // The child upgrades first and sets attributes on itself, as rtgl-checkbox does.
    customElements.define(childName, class extends HTMLElement {
      connectedCallback() {
        Object.entries(selfSet).forEach(([attribute, value]) => this.setAttribute(attribute, value));
      }
    });
    customElements.define(name, createComponent(config, {}));
    const root = document.querySelector(name).shadowRoot.querySelector("[data-rtgl-render-target]");
    return {
      child: root.querySelector(childName),
      button: root.querySelector("button"),
      telemetry: globalThis.__rtglHydration,
    };
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

  it("leaves an attribute the element sets that the template never renders", () => {
    const { child, telemetry } = hydrate({
      template: (child) => [{ [`${child} kind=a`]: null }],
      serverData: {},
      clientData: {},
      selfSet: { "has-label": "" },
    });
    expect(child.hasAttribute("has-label")).toBe(true);
    expect(child.getAttribute("kind")).toBe("a");
    expect(telemetry).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("leaves a self-set attribute whose name the template toggles off on both sides", () => {
    const { child, telemetry } = hydrate({
      template: (child) => [{ [`${child} ?open=\${isOpen}`]: null }],
      serverData: { isOpen: false },
      clientData: { isOpen: false },
      selfSet: { open: "" },
    });
    expect(child.hasAttribute("open")).toBe(true);
    expect(telemetry).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("known quirk: a toggle the server rendered on stays on a custom element when the client renders it off", () => {
    const { child, telemetry } = hydrate({
      template: (child) => [{ [`${child} ?disabled=\${busy}`]: null }],
      serverData: { busy: true },
      clientData: { busy: false },
      selfSet: {},
    });
    expect(child.hasAttribute("disabled")).toBe(true);
    expect(telemetry).toEqual({ hydrated: 1, mismatched: 0, reasons: [] });
  });

  it("removes a server-only attribute from a plain element when the client renders it off", () => {
    const { button, telemetry } = hydrate({
      template: () => [{ "button#go ?disabled=${busy}": "Go" }],
      serverData: { busy: true },
      clientData: { busy: false },
      selfSet: {},
    });
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(telemetry.mismatched).toBe(1);
    expect(telemetry.reasons).toHaveLength(1);
    expect(telemetry.reasons[0]).toMatch(/button\[0\]: attribute "disabled" is not rendered by the client/);
  });
});
