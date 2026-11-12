---
template: docs
_bind:
  docs: feDocs
title: Testing
tags: documentation
sidebarId: fe-testing
---

`@rettangoli/fe/testing` exports the functions a test needs: render a view to HTML, run a store with real actions, and build a component class. They are the same functions the runtime uses, so a test exercises what the browser runs. It works with any test runner; the examples use [Vitest](https://vitest.dev/).

Available from `@rettangoli/fe` 2.1.0.

## Exports

| Export | Use it to | Needs a DOM |
| --- | --- | --- |
| `renderView` | Turn a template and view data into an HTML string | No |
| `parseTemplate` | Parse a raw template | No |
| `parseView` | Turn a parsed template and view data into a virtual DOM tree | No |
| `bindStore` | Turn `.store.js` exports into a store you can call | No |
| `createComponent` | Build the Custom Element class of a component | To call it |

Always import these from `@rettangoli/fe/testing`. Paths into the package, such as `@rettangoli/fe/src/parser.js`, are not public.

## Setup

`@rettangoli/fe/testing` brings its own template engine, virtual DOM and Immer. Install the packages your tests import by name:

| Package | Needed for |
| --- | --- |
| A test runner (`vitest` in the examples) | Every test |
| `js-yaml` | Loading `.view.yaml` and `.schema.yaml` |
| `snabbdom` | `h` for `parseView` |
| `jsdom` | Component tests |

```bash
npm install --save-dev vitest js-yaml snabbdom jsdom
```

Two details in the examples matter:

- Files are read with `path.join(import.meta.dirname, ...)`, available from Node 20.11. Under `// @vitest-environment jsdom`, `new URL('./file', import.meta.url)` can't be passed to `readFileSync`, because the global `URL` is jsdom's.
- `load` is imported from `js-yaml` by name. The package has no default export from version 5.

## Example Component

The examples below test this component. Its files and the test files are in one folder.

`todoList.schema.yaml`

```yaml
componentName: todo-list
propsSchema:
  type: object
  properties:
    heading:
      type: string
```

`todoList.view.yaml`

```yaml
template:
  - h1: "${heading}"
  - todo-counter :items=${items}: ""
  - ul:
      - $for item in items:
          - li: "${item.label}"
  - button#addButton ?disabled=${isFull}: Add
  - button#clearButton: Clear
refs:
  addButton:
    eventListeners:
      click:
        action: addItem
        payload:
          label: New item
  clearButton:
    eventListeners:
      click:
        handler: handleClear
styles: {}
```

`todoList.store.js`

```js
export const createInitialState = () => ({
  items: [],
});

export const selectViewData = ({ state, props, constants }) => ({
  heading: props.heading,
  items: state.items,
  isFull: state.items.length >= constants.maxItems,
});

export const addItem = ({ state }, { label }) => {
  state.items.push({ label });
};

export const clearItems = ({ state }) => {
  state.items = [];
};
```

`todoList.handlers.js`

```js
export const handleClear = (deps) => {
  deps.store.clearItems();
  deps.render();
};
```

## Testing a View

`renderView` takes the `template` of a `.view.yaml` and the data `selectViewData` would return, and returns HTML.

`todoList.view.test.js`

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
import { expect, it } from "vitest";
import { renderView } from "@rettangoli/fe/testing";

const view = load(
  readFileSync(path.join(import.meta.dirname, "todoList.view.yaml"), "utf8"),
);

it("renders one row per item", () => {
  const html = renderView({
    template: view.template,
    refs: view.refs,
    viewData: {
      heading: "Today",
      items: [{ label: "Write tests" }, { label: "Ship" }],
      isFull: true,
    },
  });

  expect(html).toContain("<h1>Today</h1>");
  expect(html).toContain("<ul><li>Write tests</li><li>Ship</li></ul>");
  expect(html).toContain('<button disabled="" id="addButton">Add</button>');
});
```

```js
renderView({ template, viewData = {}, refs = {}, renderChildren })
```

- `template` is required. Pass it as loaded from YAML, or parsed with `parseTemplate`.
- `refs` is optional. No event listener is built, so handler and action names need no handlers and no store.
- `renderChildren(vnode)` is optional. It is called for every element, the wrapping `div` included. Whatever it returns, other than `null` or `undefined`, is written as that element's children with no escaping, so return a string of safe HTML. Return `null` to render the element's own children.
- The result is wrapped in `<div style="display: contents">`, the component's render target.
- Text and attribute values are escaped.
- `?disabled=${isFull}` writes `disabled=""` only when the value is the boolean `true` or the string `"true"`. Other truthy values, such as `1` or `"yes"`, write nothing.
- Property bindings (`:items=${items}`) write nothing, because a property is not markup. Use `parseView` to assert on them.
- Child components are written as their tag only.

### Asserting on the Tree

`parseView` returns the virtual DOM tree, with properties and listeners on it. The view has an `action` listener, so `handlers` holds `handleCallStoreAction`.

`todoList.tree.test.js`

```js
import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
import { h } from "snabbdom/build/h.js";
import { expect, it, vi } from "vitest";
import { parseTemplate, parseView } from "@rettangoli/fe/testing";

const view = load(
  readFileSync(path.join(import.meta.dirname, "todoList.view.yaml"), "utf8"),
);

it("passes the items to the counter and wires the buttons", () => {
  const items = [{ label: "Write tests" }];
  const handleClear = vi.fn();
  const handleCallStoreAction = vi.fn();

  const vnode = parseView({
    h,
    template: parseTemplate(view.template),
    viewData: { heading: "Today", items, isFull: false },
    refs: view.refs,
    handlers: { handleClear, handleCallStoreAction },
  });
  const [heading, counter, list, addButton, clearButton] = vnode.children;

  expect(heading.text).toBe("Today");
  expect(counter.data.props.items).toBe(items);
  expect(list.children).toHaveLength(1);

  const event = { type: "click" };
  clearButton.data.on.click(event);
  expect(handleClear).toHaveBeenCalledWith({ _event: event });

  addButton.data.on.click(event);
  expect(handleCallStoreAction).toHaveBeenCalledWith({
    label: "New item",
    _event: event,
    _action: "addItem",
  });
});
```

```js
parseView({ h, template, viewData, refs, handlers, wireEventListeners = true })
```

- `h` is snabbdom's `h`. In plain Node, import it from `snabbdom/build/h.js`: the `snabbdom` entry reads `window` when it is imported.
- `template` must be parsed with `parseTemplate` first.
- `handlers` must be a plain object that can take new properties, because `parseView` keeps listener state in a hidden property on it. The exports of a module (`import * as handlers`) and frozen objects throw as soon as the view has a listener. Pass a copy: `{ ...handlers }`.
- A `handler` listener calls `handlers[name](payload)`, with the event in `payload._event`.
- An `action` listener calls `handlers.handleCallStoreAction(payload)`, with the action name in `payload._action`. A view with action listeners needs that function, or `parseView` throws.
- `wireEventListeners: false` builds no listeners and needs no `handlers`.

## Testing a Store

`bindStore` gives a store the same binding a component gives it: selectors read the state, and actions run through [Immer](https://immerjs.github.io/immer/).

`todoList.store.test.js`

```js
import { expect, it } from "vitest";
import { bindStore } from "@rettangoli/fe/testing";
import * as todoListStore from "./todoList.store.js";

it("adds items until the list is full", () => {
  const store = bindStore(todoListStore, { heading: "Today" }, { maxItems: 2 });

  const before = store.getState();
  store.addItem({ label: "Write tests" });

  expect(before.items).toHaveLength(0);
  expect(store.selectViewData()).toEqual({
    heading: "Today",
    items: [{ label: "Write tests" }],
    isFull: false,
  });

  store.addItem({ label: "Ship" });
  expect(store.selectViewData().isFull).toBe(true);

  expect(() => store.addItem("Ship")).toThrow(
    "[Store] Action 'addItem' expects payload to be an object.",
  );
});
```

```js
bindStore(store, props, constants, runtimeContext = {}, { deferInitialization = false } = {})
```

- `store` is the exports of a `.store.js`.
- `props` and `constants` reach every store function as `ctx.props` and `ctx.constants`, as given. Pass objects when the store reads from them.
- `runtimeContext` is `{ getI18n, locale }`, for stores that read `ctx.i18n` and `ctx.locale`.
- `deferInitialization: true` runs `createInitialState` on the first read instead of right away.

The bound store has `getState()`, each `select*` export as `selector(...args)`, and every other export as `action(payload = {})`. An action returns the next state.

- An action never changes a state object it already returned.
- The state is frozen after the first action.
- A payload must be an object that is not `null` and not an array. A string, number, boolean, function, `null` or array throws. Class instances such as a `Date` or a `Map` are accepted.
- Every export is bound. One that is not a function (`export const MAX_ITEMS = 5`) becomes a function that throws `[Store] Action 'MAX_ITEMS' is not defined.` when called. Keep such values in `.constants.yaml`.
- An action that throws leaves the state as it was.
- Each `bindStore` call has its own state.

## Testing a Handler

A handler is a function of `(deps, payload)`. Call it with a real store and a spy for `render`. Handlers call `render()` themselves, so the spy tells you whether the handler asked for a render.

`todoList.handlers.test.js`

```js
import { expect, it, vi } from "vitest";
import { bindStore } from "@rettangoli/fe/testing";
import * as todoListStore from "./todoList.store.js";
import { handleClear } from "./todoList.handlers.js";

it("clears the items and renders", () => {
  const store = bindStore(todoListStore, { heading: "Today" }, { maxItems: 2 });
  store.addItem({ label: "Write tests" });
  const render = vi.fn();

  handleClear({ store, render });

  expect(store.getState().items).toEqual([]);
  expect(render).toHaveBeenCalledTimes(1);
});
```

`deps` holds only what the test puts in it. Add `props`, `constants`, `refs`, `dispatchEvent` or your own dependencies when the handler reads them.

## Testing a Component

`createComponent` returns a class that extends `HTMLElement`, so it needs a DOM: a browser, or jsdom. A component adopts constructable stylesheets when it connects. Older jsdom versions have none (26 does not, 31 does), so define `CSSStyleSheet` before mounting, but only when `replaceSync` is missing: a jsdom that has them rejects a stand-in.

`todoList.component.test.js`

```js
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
import { beforeEach, expect, it, vi } from "vitest";
import { createComponent, parseTemplate } from "@rettangoli/fe/testing";
import * as todoListStore from "./todoList.store.js";
import * as todoListHandlers from "./todoList.handlers.js";

const loadYaml = (fileName) =>
  load(readFileSync(path.join(import.meta.dirname, fileName), "utf8"));
const schema = loadYaml("todoList.schema.yaml");
const view = loadYaml("todoList.view.yaml");

beforeEach(() => {
  if (typeof globalThis.CSSStyleSheet?.prototype.replaceSync !== "function") {
    vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
  }
});

it("adds an item on click, then clears the list", () => {
  customElements.define(
    "todo-list",
    createComponent(
      {
        schema,
        view: { ...view, template: parseTemplate(view.template) },
        store: todoListStore,
        handlers: todoListHandlers,
        constants: { maxItems: 2 },
      },
      {},
    ),
  );
  const element = document.createElement("todo-list");
  element.setAttribute("heading", "Today");
  document.body.appendChild(element);
  const find = (selector) => element.renderTarget.querySelector(selector);

  expect(find("h1").textContent).toBe("Today");

  find("#addButton").click();
  expect(element.store.getState().items).toEqual([{ label: "New item" }]);
  expect(find("ul").children).toHaveLength(1);

  find("#clearButton").click();
  expect(find("ul").children).toHaveLength(0);
});
```

```js
createComponent({ schema, view, store, handlers, methods, constants }, deps)
```

- `schema` and `view` are required. `view.template` must be parsed with `parseTemplate`.
- `store`, `handlers`, `methods` and `constants` are the exports of the matching files.
- `deps` is the custom dependencies handlers receive.

jsdom does not lay out or paint. For behavior that depends on a real browser, use [Rettangoli VT](/vt/docs/introduction/quickstart).
