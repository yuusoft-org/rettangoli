// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "jempl";
import { freeze } from "immer";
import createComponent from "../../src/createComponent.js";

// An `action:` listener renders its payload template once, against the view
// data and the event, exactly like a `handler:` listener. The store action
// gets that payload: text is never read as a template a second time, the
// event and class instances arrive as they are, and arrays and plain objects
// arrive as fresh, mutable copies.

let componentNumber = 0;

const mount = ({ viewData, payload }) => {
  const name = `x-action-payload-${componentNumber++}`;
  const received = { action: [], handler: [] };
  const renders = { count: 0 };
  customElements.define(name, createComponent({
    schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
    view: {
      template: parse([
        { "button#viaAction": "A" },
        { "button#viaHandler": "H" },
        { "input#field": "" },
      ]),
      refs: {
        viaAction: { eventListeners: { click: { action: "record", payload } } },
        viaHandler: { eventListeners: { click: { handler: "handleRecord", payload } } },
        field: {
          eventListeners: {
            input: { action: "record", payload: { value: "${_event.target.value}" } },
          },
        },
      },
      styles: {},
    },
    store: {
      selectViewData: () => {
        renders.count += 1;
        return viewData;
      },
      record: (_context, value) => {
        received.action.push(value);
      },
    },
    handlers: {
      handleRecord: (_deps, value) => {
        received.handler.push(value);
      },
    },
  }, {}));
  const el = document.body.appendChild(document.createElement(name));
  const $ = (selector) => el.shadowRoot.querySelector(selector);
  return {
    el,
    received,
    renders,
    clickAction: () => {
      $("#viaAction").click();
      return received.action.at(-1);
    },
    clickHandler: () => {
      $("#viaHandler").click();
      return received.handler.at(-1);
    },
    type: (text) => {
      $("#field").value = text;
      $("#field").dispatchEvent(new Event("input", { bubbles: true }));
      return received.action.at(-1);
    },
  };
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback) => setTimeout(callback, 0));
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("action payloads are rendered once", () => {
  it("keeps `${...}` and `#{...}` text from view data literally", () => {
    const view = mount({
      viewData: { label: "Costs ${price} total", tag: "#{row}", price: 5 },
      payload: { label: "${label}", tag: "${tag}", escaped: "\\${price}", raw: "literal" },
    });

    const action = view.clickAction();
    const handler = view.clickHandler();

    expect(action).toEqual({ ...handler, _action: "record" });
    expect(action.label).toBe("Costs ${price} total");
    expect(action.tag).toBe("#{row}");
    expect(action.escaped).toBe("${price}");
    expect(action.raw).toBe("literal");
  });

  it("keeps typed text literally, including text that is not valid template syntax", () => {
    const view = mount({ viewData: { price: 5 }, payload: {} });

    expect(view.type("cost ${price}").value).toBe("cost ${price}");
    expect(view.type("c=${_event.target.ownerDocument.location.href}").value)
      .toBe("c=${_event.target.ownerDocument.location.href}");
    expect(view.type("a ${b + c}").value).toBe("a ${b + c}");
    expect(view.type("#{row}").value).toBe("#{row}");
    expect(view.received.action).toHaveLength(4);
  });

  it("keeps `$`-prefixed keys inside data", () => {
    const item = { "$if flag": { extra: 1 }, keep: 2, $each: "x" };
    const view = mount({ viewData: { item }, payload: { item: "${item}" } });

    expect(view.clickAction().item).toEqual(item);
  });

  it("passes the event, Date, File and class instances by reference", () => {
    class Point {
      constructor() {
        this.x = 1;
      }
    }
    const when = new Date(0);
    const file = new File(["x"], "a.txt");
    const point = new Point();
    const view = mount({
      viewData: { when, file, point, nested: { when } },
      payload: { when: "${when}", file: "${file}", point: "${point}", nested: "${nested}" },
    });

    const action = view.clickAction();

    expect(action._event).toBeInstanceOf(Event);
    expect(action._event.type).toBe("click");
    expect(action._action).toBe("record");
    expect(action.when).toBe(when);
    expect(action.file).toBe(file);
    expect(action.point).toBe(point);
    expect(action.nested.when).toBe(when);
  });

  it("copies arrays and plain objects, so an action may mutate them", () => {
    const item = freeze({ tags: ["a"], meta: { n: 1 } }, true);
    const list = freeze([{ id: 1 }], true);
    const view = mount({ viewData: { item, list }, payload: { item: "${item}", list: "${list}" } });

    const action = view.clickAction();

    expect(action.item).toEqual(item);
    expect(action.item).not.toBe(item);
    expect(action.item.tags).not.toBe(item.tags);
    expect(action.list[0]).not.toBe(list[0]);
    expect(Object.isFrozen(action.item.meta)).toBe(false);
    action.item.meta.n = 2;
    action.list.push({ id: 2 });
    expect(item.meta.n).toBe(1);
    expect(list).toHaveLength(1);
  });

  it("copies data the way the old second pass did: undefined, null, numbers, nested arrays", () => {
    const sparse = [1, , 3]; // eslint-disable-line no-sparse-arrays
    const bare = Object.assign(Object.create(null), { a: 1, inner: Object.assign(Object.create(null), { b: 2 }) });
    const symbol = Symbol("hidden");
    const source = {
      missing: undefined,
      empty: null,
      zero: 0,
      negativeZero: -0,
      nan: NaN,
      flag: false,
      nested: [[1, [2, [3]]], []],
      withUndefined: [undefined, null, 0],
      sparse,
      bare,
      [symbol]: "symbol",
    };
    Object.defineProperty(source, "hidden", { value: "hidden", enumerable: false });
    const view = mount({
      viewData: { data: source },
      payload: { data: "${data}" },
    });

    const { data } = view.clickAction();

    expect(Object.keys(data)).toContain("missing");
    expect(data.missing).toBeUndefined();
    expect(data.empty).toBeNull();
    expect(data.zero).toBe(0);
    expect(Object.is(data.negativeZero, -0)).toBe(true);
    expect(data.nan).toBeNaN();
    expect(data.flag).toBe(false);
    expect(data.nested).toEqual([[1, [2, [3]]], []]);
    // Arrays drop undefined entries and holes; null-prototype objects become plain.
    expect(data.withUndefined).toEqual([null, 0]);
    expect(data.sparse).toEqual([1, 3]);
    expect(Object.getPrototypeOf(data.bare)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(data.bare.inner)).toBe(Object.prototype);
    expect(data.bare).toEqual({ a: 1, inner: { b: 2 } });
    // Symbol keys and non-enumerable properties are not copied.
    expect(Object.getOwnPropertySymbols(data)).toEqual([]);
    expect(Object.getOwnPropertyNames(data)).not.toContain("hidden");
  });

  it("calls the action once and then renders", () => {
    const view = mount({ viewData: {}, payload: { a: 1 } });
    const before = view.renders.count;

    view.clickAction();

    expect(view.received.action).toHaveLength(1);
    expect(view.renders.count).toBe(before + 1);
  });

  it("names a missing store action", () => {
    const name = `x-action-missing-${componentNumber++}`;
    customElements.define(name, createComponent({
      schema: { componentName: name, propsSchema: { type: "object", properties: {} } },
      view: {
        template: parse([{ "button#go": "Go" }]),
        refs: { go: { eventListeners: { click: { action: "missing" } } } },
        styles: {},
      },
      store: { selectViewData: () => ({}) },
      handlers: {},
    }, {}));
    const el = document.body.appendChild(document.createElement(name));
    const errors = [];
    const onError = (event) => {
      errors.push(event.error?.message);
      event.preventDefault();
    };
    window.addEventListener("error", onError);
    el.shadowRoot.querySelector("#go").click();
    window.removeEventListener("error", onError);

    expect(errors).toEqual(["[Store] Action 'store.missing' is not defined."]);
  });
});
