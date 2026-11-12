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
- `renderChildren(vnode)`: optional. When it returns a string for an element,
  that string is written as the element's children as given, with no escaping.
  Return `null` to render the element's own children.

The result is the view wrapped in the component's render target,
`<div style="display: contents">...</div>`.

Rules:
- text and attribute values are escaped
- a `?name=${expr}` binding writes `name=""` when the value is true and
  nothing when it is false
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
  imported and throws there. The test project `MUST` list `snabbdom` as its
  own dependency to import from it.
- `template` (required): a parsed template. A raw one `MUST` go through
  `parseTemplate` first.
- `viewData`: the object `selectViewData` returns.
- `refs`: the `refs` of the `.view.yaml`.
- `handlers`: the object the listeners call. In a component the runtime
  passes handlers with `deps` already bound, so here a handler receives the
  payload only.
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
- an action payload that is not a plain object (a string, a number, `null`,
  an array) throws `[Store] Action '<name>' expects payload to be an object.`
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

jsdom has no constructable stylesheets, which a component adopts when it
connects. A jsdom test `MUST` define `CSSStyleSheet` with a `replaceSync`
method before it mounts a component.

## 3. View Test

```js
import { readFileSync } from "node:fs";
import yaml from "js-yaml";
import { expect, it } from "vitest";
import { renderView } from "@rettangoli/fe/testing";

const view = yaml.load(
  readFileSync(new URL("./todoList.view.yaml", import.meta.url), "utf8"),
);

it("renders one row per item", () => {
  const html = renderView({
    template: view.template,
    refs: view.refs,
    viewData: { title: "Today", items: [{ id: "a", label: "Write tests" }] },
  });

  expect(html).toContain("<h1>Today</h1>");
  expect(html).toContain("Write tests");
});
```

To assert on structure, properties or listeners, build the tree:

```js
import { h } from "snabbdom/build/h.js";
import { expect, vi } from "vitest";
import { parseTemplate, parseView } from "@rettangoli/fe/testing";

const handleSelectItem = vi.fn();
const vnode = parseView({
  h,
  template: parseTemplate(view.template),
  viewData: { title: "Today", items },
  refs: view.refs,
  handlers: { handleSelectItem },
});

const list = vnode.children[1];
expect(list.data.props.items).toBe(items);

list.data.on.click({ type: "click" });
expect(handleSelectItem).toHaveBeenCalledTimes(1);
```

## 4. Store Test

```js
import { expect, it } from "vitest";
import { bindStore } from "@rettangoli/fe/testing";
import * as todoStore from "./todoList.store.js";

it("adds an item", () => {
  const store = bindStore(todoStore, { listId: "today" }, { maxItems: 10 });

  const before = store.getState();
  store.addItem({ label: "Write tests" });

  expect(store.selectViewData().items).toHaveLength(1);
  expect(before.items).toHaveLength(0);
  expect(() => store.addItem("Write tests")).toThrow(
    "[Store] Action 'addItem' expects payload to be an object.",
  );
});
```

## 5. Handler Test

A handler is a function of `(deps, payload)`. Call it with a real bound store
and a spy for `render`. Handlers call `render()` themselves (`handlers.md`),
so the spy shows whether the handler asked for a render.

```js
import { expect, it, vi } from "vitest";
import { bindStore } from "@rettangoli/fe/testing";
import * as todoStore from "./todoList.store.js";
import { handleAddItem } from "./todoList.handlers.js";

it("adds the item and renders", () => {
  const store = bindStore(todoStore, { listId: "today" }, { maxItems: 10 });
  const render = vi.fn();

  handleAddItem({ store, render }, { label: "Write tests" });

  expect(store.getState().items).toHaveLength(1);
  expect(render).toHaveBeenCalledTimes(1);
});
```

`deps` holds only what the test puts in it. Add `props`, `constants`, `refs`,
`dispatchEvent` or custom dependencies when the handler reads them.

## 6. Component Test

Needs a DOM environment. With Vitest and jsdom:

```js
// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { createComponent, parseTemplate } from "@rettangoli/fe/testing";

beforeEach(() => {
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
});

it("renders after an action listener", () => {
  customElements.define(
    "todo-list",
    createComponent(
      {
        schema,
        view: { ...view, template: parseTemplate(view.template) },
        store: todoStore,
        handlers: todoHandlers,
      },
      {},
    ),
  );

  const element = document.body.appendChild(document.createElement("todo-list"));
  element.renderTarget.querySelector("#addButton").click();

  expect(element.store.getState().items).toHaveLength(1);
});
```

jsdom does not lay out or paint. Use `@rettangoli/vt` for behavior that
depends on a real browser.

## 7. Invalid Example

```js
import { parseView } from "@rettangoli/fe/src/parser.js";
import parse from "@rettangoli/fe/node_modules/jempl/src/parse/index.js";
```

Invalid because neither path is public. Use `parseView` and `parseTemplate`
from `@rettangoli/fe/testing`.
