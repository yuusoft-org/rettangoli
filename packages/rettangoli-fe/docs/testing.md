# Testing Spec (`@rettangoli/fe/testing`)

This document defines the public testing entry.

Available from `@rettangoli/fe` 2.1.0.

## 1. Scope

`@rettangoli/fe/testing` owns the functions a test needs to:
- turn a `.view.yaml` template and view data into HTML or a virtual DOM tree
- run a `.store.js` through the real store binding
- build a component class from a component's files

It is not a test runner and adds no assertions, mocks or DOM. Use it with any
runner. The examples below use Vitest.

Tests `MUST` import these functions from `@rettangoli/fe/testing`. Files
inside the package (`@rettangoli/fe/src/...`) and the `jempl` installed under
it are not public paths: the `exports` map does not expose them, and a path
into `node_modules` can bind a different copy of a dependency than the one the
runtime uses.

## 2. Exports

| Export | Purpose | Needs a DOM |
| --- | --- | --- |
| `renderView` | template + view data -> HTML string | no |
| `parseTemplate` | raw template -> parsed template (jempl AST) | no |
| `parseView` | parsed template + view data -> virtual DOM tree | no |
| `bindStore` | `.store.js` exports -> bound store | no |
| `createComponent` | component files -> Custom Element class | to call it |

Every export is the function the runtime uses, re-exported. `renderView` and
`bindStore` are the same functions `@rettangoli/fe/server` exports, and
`createComponent` is the same function `@rettangoli/fe` exports. There is one
name per function and no default export.

Importing the entry reads no DOM global, so it loads in plain Node.

### `renderView`

```js
renderView({ template, viewData = {}, refs = {}, renderChildren }) // -> string
```

- `template` (required): the `template` of a `.view.yaml`, either as loaded
  from YAML (an array) or already parsed with `parseTemplate`. A parsed
  template can be rendered any number of times.
- `viewData`: the object `selectViewData` returns.
- `refs`: the `refs` of the `.view.yaml`. It is optional. No event listener is
  built, so `handler` and `action` names in it need no handlers and no store.
- `renderChildren(vnode)`: optional. It is called for every element, the
  wrapping `div` included. When it returns anything other than `null` or
  `undefined`, that value is written as the element's children as given, with
  no escaping, so return a string of HTML that is already safe. Return `null`
  to render the element's own children.

The result is the view wrapped in the component's render target,
`<div style="display: contents">...</div>`.

Rules:
- text and attribute values are escaped
- a `?name=${expr}` binding writes `name=""` when the value is the boolean
  `true` or the string `"true"`, and nothing for every other value, other
  truthy values such as `1` or `"yes"` included
- a `:name=${expr}` property binding writes nothing: a property is a value on
  the element, not markup. Assert on it with `parseView` (`data.props`).
- child components are written as their tag only. `renderComponent` from
  `@rettangoli/fe/server` renders a tree of components (`prerender.md`).
- a missing `template` throws `[renderView] \`template\` is required.`
- a template whose root is not an array throws
  `[Parser] Input to createVirtualDom must be an array, got <type>`

### `parseTemplate`

```js
parseTemplate(template) // -> parsed template
```

Parses a raw template into the form `parseView` and `createComponent` take.
It is jempl's `parse`, from the jempl the runtime renders with.

### `parseView`

```js
parseView({
  h,
  template,
  viewData,
  refs,
  handlers,
  createComponentUpdateHook,
  wireEventListeners = true,
}) // -> vnode
```

- `h` (required): snabbdom's `h`. In plain Node import it from
  `snabbdom/build/h.js`: the `snabbdom` entry reads `window` when it is
  imported and throws there.
- `template` (required): a parsed template. A raw one `MUST` go through
  `parseTemplate` first.
- `viewData`: the object `selectViewData` returns.
- `refs`: the `refs` of the `.view.yaml`.
- `handlers`: the object the listeners call. In a component the runtime
  passes handlers with `deps` already bound, so here a handler receives the
  payload only.
  - It `MUST` be a plain object that can take new properties, because
    `parseView` keeps listener state in a hidden property on it. The exports
    of a module (`import * as handlers`) or a frozen object throw
    `Cannot redefine property: __eventRateLimitState` or
    `Cannot define property __eventRateLimitState, object is not extensible`
    as soon as the view has a listener. Pass a copy: `{ ...handlers }`.
  - A `handler` listener calls `handlers[name](payload)` with `payload._event`
    set to the event. A name that `handlers` does not hold logs the
    `[Parser] Handler '<name>' ... is referenced but not found` warning
    (`handlers.md`) and builds no listener.
  - An `action` listener calls `handlers.handleCallStoreAction(payload)` with
    `payload._event` and `payload._action` (the action name) set. A view with
    an `action` listener `MUST` be given that function, or `parseView` throws
    `[Runtime] Action listener '<name>' requires handlers.handleCallStoreAction.`
- `createComponentUpdateHook`: internal to the browser runtime. Tests omit it.
- `wireEventListeners`: `false` builds no listeners and needs no `handlers`,
  as in `renderView`.

The result is a snabbdom vnode: a `div` with `data.style.display` `contents`
whose `children` are the view's elements. Each element carries `sel`, `text`
or `children`, `key`, and `data` with `attrs`, `class`, `props` and `on`.

### `bindStore`

```js
bindStore(
  store,
  props,
  constants,
  runtimeContext = {},
  { deferInitialization = false } = {},
) // -> bound store
```

- `store`: the exports of a `.store.js` (`import * as store from ...`).
- `props`, `constants`: passed to every store function as `ctx.props` and
  `ctx.constants`, as given. They are not defaulted: a store that reads
  `props.x` needs an object here.
- `runtimeContext`: `{ getI18n, locale }`. `getI18n()` is called on every
  selector and action call and its result is `ctx.i18n` (`{}` without it);
  `locale` is `ctx.locale`. `createInitialState` receives neither.
- `deferInitialization`: `true` runs `createInitialState` on the first
  `getState`, selector or action call instead of at bind time.

The bound store has:
- `getState()`: the current state
- one function per `select*` export, called as `selector(...args)`; it runs
  `export(ctx, ...args)` and returns its result
- one function per other export except `createInitialState`, called as
  `action(payload = {})`; it runs `export(ctx, payload)` on an Immer draft and
  returns the next state

Rules:
- an export is a selector when its name starts with `select`; every other
  export is an action
- every export is bound, whatever its value. An export that is not a function
  (`export const MAX_ITEMS = 5`) becomes a function that throws
  `[Store] Action 'MAX_ITEMS' is not defined.` when called (`Selector` for a
  `select*` name). Keep such values in `.constants.yaml`.
- an action payload `MUST` be an object that is not `null` and not an array.
  A string, number, boolean, function, `null` or array throws
  `[Store] Action '<name>' expects payload to be an object.` Any other object
  is accepted, class instances such as a `Date` or a `Map` included.
- an action never changes a state object that was already returned. Parts of
  the state it did not change keep their references.
- the state is frozen after the first action
- an action that returns a value replaces the state with it
- an action that throws leaves the state as it was
- each `bindStore` call has its own state

An action called on a bound store does not render anything (`store.md`,
`handlers.md`).

### `createComponent`

```js
createComponent({ schema, view, store, handlers, methods, constants }, deps) // -> class
```

- `schema`: the `.schema.yaml` content. Required.
- `view`: `{ template, refs, styles }` from the `.view.yaml`, with `template`
  parsed by `parseTemplate`. Required.
- `store`, `handlers`, `methods`, `constants`: the exports of the matching
  files. Optional.
- `deps`: the custom dependencies handlers receive in `deps`.

It returns a class to register with `customElements.define`. The class
extends `HTMLElement`, so calling `createComponent` in plain Node throws
`ReferenceError: HTMLElement is not defined`. It needs a DOM environment:
a browser, or jsdom.

A component adopts constructable stylesheets when it connects. Older jsdom
versions have none (26 does not, 31 does). A jsdom test `MUST` define
`CSSStyleSheet` with a `replaceSync` method before it mounts a component when
`CSSStyleSheet.prototype.replaceSync` is missing, and `MUST NOT` replace it
when it is there: a jsdom that has constructable stylesheets rejects a
stand-in with `Failed to set the 'adoptedStyleSheets' property on 'ShadowRoot'`.

## 3. Test Project Setup

`@rettangoli/fe/testing` brings its own jempl, snabbdom and Immer. A test
project installs the packages its tests import by name:

| Package | Needed for |
| --- | --- |
| a test runner (`vitest` in the examples) | every test |
| `js-yaml` | loading `.view.yaml` and `.schema.yaml` |
| `snabbdom` | `h` for `parseView` |
| `jsdom` | component tests |

The examples read files with `import.meta.dirname`, which Node has from
20.11. Under `// @vitest-environment jsdom` the global `URL` is jsdom's, so
`readFileSync(new URL("./file", import.meta.url))` throws
`The URL must be of scheme file` there; a path works in both environments.

Import `load` from `js-yaml` by name. The package has no default export from
version 5.

## 4. Example Component

The examples in sections 5 to 9 test this component. Its files and the test
files are in one folder.

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

## 5. View Test

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

## 6. View Tree Test

To assert on structure, properties or listeners, build the tree. The view has
an `action` listener, so `handlers` holds `handleCallStoreAction`.

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

## 7. Store Test

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

## 8. Handler Test

A handler is a function of `(deps, payload)`. Call it with a real bound store
and a spy for `render`. Handlers call `render()` themselves (`handlers.md`),
so the spy shows whether the handler asked for a render.

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

`deps` holds only what the test puts in it. Add `props`, `constants`, `refs`,
`dispatchEvent` or custom dependencies when the handler reads them.

## 9. Component Test

Needs a DOM environment. With Vitest and jsdom:

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

jsdom does not lay out or paint. Use `@rettangoli/vt` for behavior that
depends on a real browser.

These examples run as written in
`test/testing/fixtures/todoList/`, and `test/testing/doc-examples.test.js`
fails when a file there and this document differ.

## 10. Invalid Example

```js
import { parseView } from "@rettangoli/fe/src/parser.js";
import parse from "@rettangoli/fe/node_modules/jempl/src/parse/index.js";
```

Invalid because neither path is public. Use `parseView` and `parseTemplate`
from `@rettangoli/fe/testing`.
