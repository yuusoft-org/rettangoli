/**
 * The public testing entry, `@rettangoli/fe/testing`.
 *
 * It exists so tests stop importing files from inside this package and from
 * the jempl nested under it. Two properties make that safe, and both are
 * asserted here: every export is the implementation the runtime uses (not a
 * copy), and the entry loads without a DOM.
 *
 * This file runs in the default `node` environment. What needs a DOM is in
 * `create-component.test.js`.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { parse as jemplParse } from "jempl";
import { h } from "snabbdom/build/h.js";
import { describe, expect, it, vi } from "vitest";

import internalCreateComponent from "../../src/createComponent.js";
import { bindStore as internalBindStore } from "../../src/core/runtime/store.js";
import { parseView as internalParseView } from "../../src/parser.js";
import * as server from "../../src/server/index.js";
import * as testing from "../../src/testing/index.js";

const {
  bindStore,
  createComponent,
  parseTemplate,
  parseView,
  renderView,
} = testing;

const packageDirectory = fileURLToPath(new URL("../../", import.meta.url));
const wrap = (html) => `<div style="display: contents">${html}</div>`;

describe("exports", () => {
  it("exports exactly the documented names", () => {
    expect(Object.keys(testing).sort()).toEqual([
      "bindStore",
      "createComponent",
      "parseTemplate",
      "parseView",
      "renderView",
    ]);
  });

  it("has no default export", () => {
    expect("default" in testing).toBe(false);
  });

  it("re-exports the runtime implementations, not copies", () => {
    expect(renderView).toBe(server.renderView);
    expect(bindStore).toBe(server.bindStore);
    expect(bindStore).toBe(internalBindStore);
    expect(parseView).toBe(internalParseView);
    expect(parseTemplate).toBe(jemplParse);
    expect(createComponent).toBe(internalCreateComponent);
  });

  it("shares createComponent with the package entry", async () => {
    const fe = await import("../../src/index.js");
    expect(createComponent).toBe(fe.createComponent);
  });
});

describe("node safety", () => {
  it("runs these tests without a DOM", () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof globalThis.document).toBe("undefined");
    expect(typeof globalThis.HTMLElement).toBe("undefined");
    expect(typeof globalThis.customElements).toBe("undefined");
  });

  it("imports and renders in a real Node process with no DOM globals", () => {
    // A separate process, so nothing vitest or another test file defined can
    // satisfy a stray `window` or `document` reference.
    const script = `
      const globals = ["window", "document", "HTMLElement", "customElements"];
      const present = globals.filter((name) => typeof globalThis[name] !== "undefined");
      const mod = await import("@rettangoli/fe/testing");
      const store = mod.bindStore(
        { createInitialState: () => ({ n: 1 }), add: ({ state }) => { state.n += 1; } },
        {},
        {},
      );
      store.add();
      console.log(JSON.stringify({
        present,
        names: Object.keys(mod).sort(),
        html: mod.renderView({ template: [{ p: "\${n}" }], viewData: store.getState() }),
      }));
    `;
    const output = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { cwd: packageDirectory, encoding: "utf8" },
    );
    expect(JSON.parse(output)).toEqual({
      present: [],
      names: ["bindStore", "createComponent", "parseTemplate", "parseView", "renderView"],
      html: wrap("<p>2</p>"),
    });
  });

  it("createComponent validates the config in Node, then needs HTMLElement", () => {
    // Importing it is safe. Calling it builds a class that extends
    // HTMLElement, which is the one thing here that needs a DOM.
    expect(() => createComponent({ schema: { componentName: "x-a" } })).toThrow(
      "view is not defined",
    );
    expect(() =>
      createComponent({ view: { template: parseTemplate([]), refs: {}, styles: {} } }),
    ).toThrow("schema is required");
    expect(() =>
      createComponent({
        schema: { componentName: "x-a" },
        view: { template: parseTemplate([]), refs: {}, styles: {} },
      }),
    ).toThrow(/HTMLElement is not defined/);
  });
});

describe("package exports map", () => {
  it("resolves the bare specifier to the testing entry", async () => {
    const mod = await import("@rettangoli/fe/testing");
    expect(Object.keys(mod).sort()).toEqual(Object.keys(testing).sort());
    expect(mod.renderView).toBe(renderView);
    expect(mod.bindStore).toBe(bindStore);
    expect(mod.parseView).toBe(parseView);
    expect(mod.parseTemplate).toBe(parseTemplate);
    expect(mod.createComponent).toBe(createComponent);
  });

  it("resolves through Node's own resolver", () => {
    const script =
      "console.log(import.meta.resolve('@rettangoli/fe/testing'))";
    const output = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { cwd: packageDirectory, encoding: "utf8" },
    ).trim();
    expect(output).toMatch(/\/src\/testing\/index\.js$/);
  });

  it("leaves the other entries as they were", async () => {
    const fe = await import("@rettangoli/fe");
    const serverEntry = await import("@rettangoli/fe/server");
    expect(Object.keys(fe).sort()).toEqual([
      "createComponent",
      "createI18nRuntime",
      "defineOrUpdateComponent",
      "defineOrUpdateComponents",
    ]);
    expect(Object.keys(serverEntry).sort()).toEqual([
      "bindStore",
      "loadComponents",
      "renderComponent",
      "renderDocument",
      "renderView",
      "resolveComponentDefinition",
      "serializeVNode",
    ]);
  });
});

describe("renderView", () => {
  it("renders a raw YAML-object template", () => {
    expect(
      renderView({
        template: [{ "div.card": [{ "h1#title": "${name}" }, { p: "count=${count}" }] }],
        viewData: { name: "Ada", count: 3 },
      }),
    ).toBe(wrap('<div class="card"><h1 id="title">Ada</h1><p>count=3</p></div>'));
  });

  it("renders a pre-parsed AST to the same HTML as the raw template", () => {
    const template = [{ "p.note": "${text}" }];
    const viewData = { text: "same" };
    const fromAst = renderView({ template: parseTemplate(template), viewData });
    expect(fromAst).toBe(renderView({ template, viewData }));
    expect(fromAst).toBe(wrap('<p class="note">same</p>'));
  });

  it("renders the same parsed AST repeatedly with different view data", () => {
    const template = parseTemplate([{ p: "${text}" }]);
    expect(renderView({ template, viewData: { text: "one" } })).toBe(wrap("<p>one</p>"));
    expect(renderView({ template, viewData: { text: "two" } })).toBe(wrap("<p>two</p>"));
    expect(renderView({ template, viewData: { text: "one" } })).toBe(wrap("<p>one</p>"));
  });

  it("does not change the raw template or the view data", () => {
    const template = [{ "input :value=${value}": "" }, { p: "${text}" }];
    const viewData = { value: "v", text: "t" };
    const templateBefore = structuredClone(template);
    const viewDataBefore = structuredClone(viewData);
    renderView({ template, viewData });
    expect(template).toEqual(templateBefore);
    expect(viewData).toEqual(viewDataBefore);
  });

  it("renders an empty template as the empty wrapper", () => {
    expect(renderView({ template: [] })).toBe(wrap(""));
  });

  describe("$if", () => {
    const template = [
      {
        "$if isLoading": [{ p: "Loading" }],
        "$elif error": [{ p: "Failed: ${error}" }],
        $else: [{ p: "Ready" }],
      },
    ];

    it.each([
      [{ isLoading: true, error: "x" }, "<p>Loading</p>"],
      [{ isLoading: false, error: "timeout" }, "<p>Failed: timeout</p>"],
      [{ isLoading: false, error: "" }, "<p>Ready</p>"],
      [{}, "<p>Ready</p>"],
    ])("renders the branch for %j", (viewData, expected) => {
      expect(renderView({ template, viewData })).toBe(wrap(expected));
    });

    it("renders nothing for a false $if with no $else", () => {
      expect(
        renderView({ template: [{ "$if show": [{ p: "x" }] }], viewData: { show: false } }),
      ).toBe(wrap(""));
    });
  });

  describe("$for", () => {
    const template = [
      { ul: [{ "$for item, index in items": [{ "li#item${index}": "${item.name}" }] }] },
    ];

    it("renders one element per item, with the index", () => {
      expect(
        renderView({ template, viewData: { items: [{ name: "a" }, { name: "b" }] } }),
      ).toBe(wrap('<ul><li id="item0">a</li><li id="item1">b</li></ul>'));
    });

    it("renders nothing for an empty list", () => {
      expect(renderView({ template, viewData: { items: [] } })).toBe(wrap("<ul></ul>"));
    });

    it("nests $if inside $for", () => {
      expect(
        renderView({
          template: [
            {
              "$for item in items": [
                { "$if item.done": [{ s: "${item.name}" }], $else: [{ span: "${item.name}" }] },
              ],
            },
          ],
          viewData: { items: [{ name: "a", done: true }, { name: "b", done: false }] },
        }),
      ).toBe(wrap("<s>a</s><span>b</span>"));
    });
  });

  describe("bindings", () => {
    it("writes attribute bindings and escapes their values", () => {
      expect(
        renderView({
          template: [{ "input placeholder=${label} type=text": "" }],
          viewData: { label: 'A "quoted" <name> & more' },
        }),
      ).toBe(wrap('<input placeholder="A &quot;quoted&quot; &lt;name&gt; &amp; more" type="text">'));
    });

    it("writes a boolean binding only when it is true", () => {
      const template = [{ "button ?disabled=${isBusy}": "Save" }];
      expect(renderView({ template, viewData: { isBusy: true } })).toBe(
        wrap('<button disabled="">Save</button>'),
      );
      expect(renderView({ template, viewData: { isBusy: false } })).toBe(
        wrap("<button>Save</button>"),
      );
    });

    it("leaves property bindings out of the HTML", () => {
      // A property is a value on the element, not markup. To assert on one,
      // read `data.props` from the tree parseView returns.
      expect(
        renderView({
          template: [{ "x-list :items=${items} label=Fruit": "" }],
          viewData: { items: ["apple"] },
        }),
      ).toBe(wrap('<x-list label="Fruit"></x-list>'));
    });

    it("rejects the legacy property binding form", () => {
      expect(() =>
        renderView({ template: [{ "input .value=${value}": "" }], viewData: { value: "v" } }),
      ).toThrow("Property-form bindings must use ':prop=${value}' syntax.");
    });

    it("merges selector classes and ids with attributes", () => {
      expect(renderView({ template: [{ "div#box.a.b class=c": "x" }] })).toBe(
        wrap('<div class="a b c" id="box">x</div>'),
      );
    });
  });

  describe("text", () => {
    it("escapes interpolated text", () => {
      expect(
        renderView({
          template: [{ p: "${text}" }],
          viewData: { text: "<script>alert(1)</script> & <b>bold</b>" },
        }),
      ).toBe(wrap("<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;</p>"));
    });

    it("escapes literal template text", () => {
      expect(renderView({ template: [{ p: "a < b & c" }] })).toBe(
        wrap("<p>a &lt; b &amp; c</p>"),
      );
    });

    it("renders a missing value as empty text when viewData is omitted", () => {
      expect(renderView({ template: [{ p: "${missing}" }] })).toBe(wrap("<p></p>"));
    });

    it("renders numbers and zero", () => {
      expect(
        renderView({ template: [{ p: "${a}/${b}" }], viewData: { a: 0, b: 12.5 } }),
      ).toBe(wrap("<p>0/12.5</p>"));
    });
  });

  describe("refs", () => {
    const template = [{ "button#saveButton": "Save" }];

    it("renders the same HTML with refs given and omitted", () => {
      const withRefs = renderView({
        template,
        refs: { saveButton: { eventListeners: { click: { handler: "handleSave" } } } },
      });
      expect(withRefs).toBe(wrap('<button id="saveButton">Save</button>'));
      expect(withRefs).toBe(renderView({ template }));
    });

    it("needs no handlers or store for handler and action listeners", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        expect(
          renderView({
            template,
            refs: {
              saveButton: {
                eventListeners: {
                  click: { action: "save" },
                  keydown: { handler: "notDefinedAnywhere" },
                },
              },
            },
          }),
        ).toBe(wrap('<button id="saveButton">Save</button>'));
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it("accepts window and document refs, which render nothing", () => {
      expect(
        renderView({
          template,
          refs: {
            window: { eventListeners: { resize: { handler: "handleResize" } } },
            document: { eventListeners: { keydown: { handler: "handleKey" } } },
          },
        }),
      ).toBe(wrap('<button id="saveButton">Save</button>'));
    });
  });

  describe("renderChildren", () => {
    it("substitutes an element's children with the returned HTML, unescaped", () => {
      expect(
        renderView({
          template: [{ "div#slot": "inner" }, { p: "kept" }],
          renderChildren: (vnode) =>
            vnode.data?.attrs?.id === "slot" ? "<b>raw</b>" : null,
        }),
      ).toBe(wrap('<div id="slot"><b>raw</b></div><p>kept</p>'));
    });
  });

  describe("errors", () => {
    it.each([
      ["no argument", undefined],
      ["an empty options object", {}],
      ["a null template", { template: null }],
      ["an undefined template", { template: undefined, viewData: {} }],
      ["an empty string template", { template: "" }],
    ])("throws for %s", (_label, options) => {
      expect(() => renderView(options)).toThrow("[renderView] `template` is required.");
    });

    it.each([
      ["an object", { p: "x" }, "object"],
      ["a string", "hello", "string"],
    ])("rejects a template whose root is %s", (_label, template, type) => {
      expect(() => renderView({ template })).toThrow(
        `[Parser] Input to createVirtualDom must be an array, got ${type}`,
      );
    });

    it("refuses view data that would inject markup through an interpolated tag", () => {
      expect(() =>
        renderView({
          template: [{ "${tag}": "hi" }],
          viewData: { tag: "div><img src=x onerror=alert(1)" },
        }),
      ).toThrow(/invalid tag name/);
    });
  });
});

describe("parseTemplate and parseView", () => {
  it("parseTemplate returns a jempl AST, which carries a numeric type", () => {
    const ast = parseTemplate([{ p: "${text}" }]);
    expect(typeof ast.type).toBe("number");
    expect(Array.isArray(ast)).toBe(false);
  });

  it("round-trips a raw template to a snabbdom vnode tree", () => {
    const vnode = parseView({
      h,
      template: parseTemplate([
        { "button#save.primary ?disabled=${isBusy}": "Save ${count}" },
        { "$if showNote": [{ p: "note" }] },
      ]),
      viewData: { count: 2, isBusy: true, showNote: true },
      refs: {},
      handlers: {},
    });

    expect(vnode.sel).toBe("div");
    expect(vnode.data.style).toEqual({ display: "contents" });
    expect(vnode.children).toHaveLength(2);

    const [button, note] = vnode.children;
    expect(button.sel).toBe("button");
    expect(button.key).toBe("save");
    expect(button.text).toBe("Save 2");
    expect(button.data.attrs).toEqual({ id: "save", disabled: "" });
    expect(button.data.class).toEqual({ primary: true });
    expect(note.sel).toBe("p");
    expect(note.text).toBe("note");
  });

  it("drops the $if branch when the condition is false", () => {
    const vnode = parseView({
      h,
      template: parseTemplate([{ "$if showNote": [{ p: "note" }] }]),
      viewData: { showNote: false },
      refs: {},
      handlers: {},
    });
    expect(vnode.children).toEqual([]);
  });

  it("keeps property bindings as real values in data.props", () => {
    const items = [{ id: 1 }];
    const vnode = parseView({
      h,
      template: parseTemplate([{ "x-list :items=${items} :count=${count}": "" }]),
      viewData: { items, count: 3 },
      refs: {},
      handlers: {},
    });
    expect(vnode.children[0].data.props.items).toBe(items);
    expect(vnode.children[0].data.props.count).toBe(3);
    expect(vnode.children[0].data.attrs ?? {}).not.toHaveProperty("items");
  });

  it("wires a handler listener that calls the handler with the event", () => {
    const handleSave = vi.fn();
    const vnode = parseView({
      h,
      template: parseTemplate([{ "button#saveButton": "Save" }]),
      viewData: {},
      refs: { saveButton: { eventListeners: { click: { handler: "handleSave" } } } },
      handlers: { handleSave },
    });

    const event = { type: "click" };
    vnode.children[0].data.on.click(event);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave.mock.calls[0][0]).toMatchObject({ _event: event });
  });

  it("warns and builds no listener for a handler that is not given", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const vnode = parseView({
        h,
        template: parseTemplate([{ "button#saveButton": "Save" }]),
        viewData: {},
        refs: { saveButton: { eventListeners: { click: { handler: "handleSave" } } } },
        handlers: {},
      });
      expect(vnode.children[0].data.on).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        "[Parser] Handler 'handleSave' for refKey 'saveButton' (matching 'saveButton') is referenced but not found in available handlers.",
      );
    } finally {
      warn.mockRestore();
    }
  });

  describe("action listeners", () => {
    const options = () => ({
      h,
      template: parseTemplate([{ "button#saveButton": "Save" }]),
      viewData: { draftId: "d1" },
      refs: {
        saveButton: {
          eventListeners: { click: { action: "save", payload: { id: "${draftId}" } } },
        },
      },
    });

    it("calls handleCallStoreAction with the payload, the event and the action name", () => {
      const handleCallStoreAction = vi.fn();
      const vnode = parseView({ ...options(), handlers: { handleCallStoreAction } });

      const event = { type: "click" };
      vnode.children[0].data.on.click(event);

      expect(handleCallStoreAction).toHaveBeenCalledTimes(1);
      expect(handleCallStoreAction).toHaveBeenCalledWith({
        id: "d1",
        _event: event,
        _action: "save",
      });
    });

    it("throws when handlers has no handleCallStoreAction", () => {
      expect(() => parseView({ ...options(), handlers: {} })).toThrow(
        "[Runtime] Action listener 'save' requires handlers.handleCallStoreAction.",
      );
    });

    it("needs no handlers with wireEventListeners: false", () => {
      const vnode = parseView({ ...options(), wireEventListeners: false });
      expect(vnode.children[0].data.on).toBeUndefined();
    });
  });

  it("builds no listeners with wireEventListeners: false", () => {
    const vnode = parseView({
      h,
      template: parseTemplate([{ "button#saveButton": "Save" }]),
      viewData: {},
      refs: { saveButton: { eventListeners: { click: { handler: "handleSave" } } } },
      wireEventListeners: false,
    });
    expect(vnode.children[0].data.on).toBeUndefined();
  });

  it("gives the same tree renderView serializes", () => {
    const template = [{ "ul.list": [{ "$for item in items": [{ li: "${item}" }] }] }];
    const viewData = { items: ["a", "b"] };
    const vnode = parseView({
      h,
      template: parseTemplate(template),
      viewData,
      refs: {},
      wireEventListeners: false,
    });
    expect(server.serializeVNode(vnode)).toBe(renderView({ template, viewData }));
  });
});

describe("bindStore", () => {
  const createCounterStore = () => ({
    createInitialState: ({ props, constants }) => ({
      count: props.start,
      step: constants.step,
      history: [],
    }),
    selectCount: ({ state }) => state.count,
    selectCountTimes: ({ state }, factor, offset = 0) => state.count * factor + offset,
    selectViewData: ({ state, props, constants }) => ({
      label: `${constants.label}: ${state.count}`,
      start: props.start,
    }),
    increment: ({ state, constants }, { by = constants.step } = {}) => {
      state.count += by;
      state.history.push(by);
    },
    reset: ({ props }) => ({ count: props.start, step: 0, history: [] }),
  });

  const bindCounter = () =>
    bindStore(createCounterStore(), { start: 1 }, { step: 2, label: "Count" });

  it("returns getState plus every selector and action, without createInitialState", () => {
    expect(Object.keys(bindCounter())).toEqual([
      "getState",
      "selectCount",
      "selectCountTimes",
      "selectViewData",
      "increment",
      "reset",
    ]);
  });

  it("builds the initial state from props and constants", () => {
    expect(bindCounter().getState()).toEqual({ count: 1, step: 2, history: [] });
  });

  it("runs selectors with state, props and constants, and passes extra arguments", () => {
    const store = bindCounter();
    expect(store.selectCount()).toBe(1);
    expect(store.selectCountTimes(10)).toBe(10);
    expect(store.selectCountTimes(10, 5)).toBe(15);
    expect(store.selectViewData()).toEqual({ label: "Count: 1", start: 1 });
  });

  it("runs actions through immer and returns the next state", () => {
    const store = bindCounter();
    expect(store.increment()).toEqual({ count: 3, step: 2, history: [2] });
    expect(store.increment({ by: 5 })).toEqual({ count: 8, step: 2, history: [2, 5] });
    expect(store.getState()).toEqual({ count: 8, step: 2, history: [2, 5] });
    expect(store.selectViewData().label).toBe("Count: 8");
  });

  it("replaces the state with what an action returns", () => {
    const store = bindCounter();
    store.increment();
    expect(store.reset()).toEqual({ count: 1, step: 0, history: [] });
    expect(store.getState()).toEqual({ count: 1, step: 0, history: [] });
  });

  it("gives an action called with no payload an empty object", () => {
    const seen = [];
    const store = bindStore({ record: (_ctx, payload) => { seen.push(payload); } }, {}, {});
    store.record();
    store.record(undefined);
    expect(seen).toEqual([{}, {}]);
  });

  it.each([
    ["a string", "hello"],
    ["a number", 1],
    ["a boolean", true],
    ["null", null],
    ["an array", [{ by: 1 }]],
  ])("rejects %s as an action payload and leaves the state alone", (_label, payload) => {
    const store = bindCounter();
    const before = store.getState();
    expect(() => store.increment(payload)).toThrow(
      "[Store] Action 'increment' expects payload to be an object.",
    );
    expect(store.getState()).toBe(before);
  });

  it("accepts class instances and events as payload values", () => {
    const store = bindStore(
      { createInitialState: () => ({ at: null }), stamp: ({ state }, { at }) => { state.at = at; } },
      {},
      {},
    );
    const at = new Date(0);
    expect(store.stamp({ at }).at).toBe(at);
  });

  describe("immutability", () => {
    it("never changes a state object it already returned", () => {
      const store = bindCounter();
      const first = store.getState();
      const firstHistory = first.history;

      const second = store.increment();

      expect(second).not.toBe(first);
      expect(first).toEqual({ count: 1, step: 2, history: [] });
      expect(first.history).toBe(firstHistory);
      expect(second.history).not.toBe(firstHistory);
    });

    it("keeps the references of branches an action did not touch", () => {
      const store = bindStore(
        {
          createInitialState: () => ({ a: { value: 1 }, b: { value: 1 } }),
          setA: ({ state }, { value }) => { state.a.value = value; },
        },
        {},
        {},
      );
      const before = store.getState();
      const after = store.setA({ value: 2 });
      expect(after.a).not.toBe(before.a);
      expect(after.b).toBe(before.b);
    });

    it("returns the same state object when an action changes nothing", () => {
      const store = bindStore(
        { createInitialState: () => ({ a: 1 }), noop: () => {} },
        {},
        {},
      );
      const before = store.getState();
      expect(store.noop()).toBe(before);
    });

    it("freezes the state after the first action, deeply", () => {
      const store = bindCounter();
      const next = store.increment();
      expect(Object.isFrozen(next)).toBe(true);
      expect(Object.isFrozen(next.history)).toBe(true);
      expect(() => {
        "use strict";
        next.count = 100;
      }).toThrow(TypeError);
      expect(store.getState().count).toBe(3);
    });

    it("does not freeze the initial state before the first action", () => {
      // Recorded, not endorsed: roadmap.md lists freezing it as a deferred decision.
      expect(Object.isFrozen(bindCounter().getState())).toBe(false);
    });

    it("leaves state unchanged when an action throws", () => {
      const store = bindStore(
        {
          createInitialState: () => ({ items: [] }),
          addThenFail: ({ state }) => {
            state.items.push("partial");
            throw new Error("boom");
          },
        },
        {},
        {},
      );
      const before = store.getState();
      expect(() => store.addThenFail()).toThrow("boom");
      expect(store.getState()).toBe(before);
      expect(store.getState().items).toEqual([]);
    });
  });

  describe("definition edge cases", () => {
    it("binds an empty store to an empty state", () => {
      const store = bindStore({}, {}, {});
      expect(Object.keys(store)).toEqual(["getState"]);
      expect(store.getState()).toEqual({});
    });

    it("uses an empty state when createInitialState is missing or returns nothing", () => {
      const select = { selectState: ({ state }) => state };
      expect(bindStore(select, {}, {}).selectState()).toEqual({});
      expect(
        bindStore({ createInitialState: () => undefined, ...select }, {}, {}).selectState(),
      ).toEqual({});
    });

    it("passes props and constants through as given, including undefined", () => {
      const store = bindStore({ selectContext: (ctx) => ctx });
      expect(store.selectContext()).toEqual({
        state: {},
        props: undefined,
        constants: undefined,
        i18n: {},
        locale: undefined,
      });
    });

    it("treats every export not named select* as an action", () => {
      const store = bindStore(
        { createInitialState: () => ({ n: 1 }), getDouble: ({ state }) => state.n * 2 },
        {},
        {},
      );
      // Not a selector by name, so it runs as an action: its return value
      // replaces the state.
      expect(store.getDouble()).toBe(2);
      expect(store.getState()).toBe(2);
    });

    it("gives each bound store its own state", () => {
      const definition = createCounterStore();
      const first = bindStore(definition, { start: 1 }, { step: 1 });
      const second = bindStore(definition, { start: 10 }, { step: 1 });
      first.increment();
      expect(first.getState().count).toBe(2);
      expect(second.getState().count).toBe(10);
    });

    it("keeps selector and action function identities stable", () => {
      const store = bindCounter();
      const { increment, selectCount } = store;
      store.increment();
      expect(store.increment).toBe(increment);
      expect(store.selectCount).toBe(selectCount);
      increment();
      expect(selectCount()).toBe(5);
    });
  });

  describe("runtimeContext", () => {
    it("supplies i18n and locale to selectors and actions", () => {
      const messages = { greeting: "Hello" };
      const store = bindStore(
        {
          createInitialState: () => ({ text: "" }),
          selectLocale: ({ locale }) => locale,
          greet: ({ state, i18n, locale }) => {
            state.text = `${i18n.greeting} (${locale})`;
          },
        },
        {},
        {},
        { getI18n: () => messages, locale: "en" },
      );
      expect(store.selectLocale()).toBe("en");
      expect(store.greet()).toEqual({ text: "Hello (en)" });
    });

    it("reads getI18n on every call", () => {
      let messages = { title: "One" };
      const store = bindStore(
        { selectTitle: ({ i18n }) => i18n.title },
        {},
        {},
        { getI18n: () => messages },
      );
      expect(store.selectTitle()).toBe("One");
      messages = { title: "Two" };
      expect(store.selectTitle()).toBe("Two");
    });

    it("does not pass i18n or locale to createInitialState", () => {
      const createInitialState = vi.fn(() => ({}));
      bindStore({ createInitialState }, { a: 1 }, { b: 2 }, { getI18n: () => ({}), locale: "en" });
      expect(createInitialState).toHaveBeenCalledTimes(1);
      expect(createInitialState).toHaveBeenCalledWith({ props: { a: 1 }, constants: { b: 2 } });
    });
  });

  describe("deferInitialization", () => {
    it("runs createInitialState when bound by default, once", () => {
      const createInitialState = vi.fn(() => ({ a: 1 }));
      const store = bindStore({ createInitialState }, {}, {});
      expect(createInitialState).toHaveBeenCalledTimes(1);
      store.getState();
      store.getState();
      expect(createInitialState).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["getState", (store) => store.getState()],
      ["a selector", (store) => store.selectA()],
      ["an action", (store) => store.touch()],
    ])("waits for the first read through %s when deferred", (_label, read) => {
      const createInitialState = vi.fn(() => ({ a: 1 }));
      const store = bindStore(
        { createInitialState, selectA: ({ state }) => state.a, touch: () => {} },
        {},
        {},
        {},
        { deferInitialization: true },
      );
      expect(createInitialState).not.toHaveBeenCalled();
      read(store);
      read(store);
      expect(createInitialState).toHaveBeenCalledTimes(1);
      expect(store.getState()).toEqual({ a: 1 });
    });
  });

  it("drives a view: store state in, HTML out", () => {
    const store = bindCounter();
    const template = parseTemplate([{ "p#label": "${label}" }]);
    expect(renderView({ template, viewData: store.selectViewData() })).toBe(
      wrap('<p id="label">Count: 1</p>'),
    );
    store.increment({ by: 4 });
    expect(renderView({ template, viewData: store.selectViewData() })).toBe(
      wrap('<p id="label">Count: 5</p>'),
    );
  });

  it("runs a handler against the real store with a render spy", () => {
    // Handlers call render() themselves; the test supplies a spy for it.
    const handleIncrement = (deps, payload = {}) => {
      deps.store.increment({ by: payload.by });
      deps.render();
    };
    const store = bindCounter();
    const render = vi.fn();

    handleIncrement({ store, render }, { by: 3 });

    expect(store.getState().count).toBe(4);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
