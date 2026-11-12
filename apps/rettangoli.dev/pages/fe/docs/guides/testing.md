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

## Testing a View

`renderView` takes the `template` of a `.view.yaml` and the data `selectViewData` would return, and returns HTML.

```js
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { expect, it } from 'vitest';
import { renderView } from '@rettangoli/fe/testing';

const view = yaml.load(
  readFileSync(new URL('./todoList.view.yaml', import.meta.url), 'utf8'),
);

it('renders one row per item', () => {
  const html = renderView({
    template: view.template,
    refs: view.refs,
    viewData: { title: 'Today', items: [{ id: 'a', label: 'Write tests' }] },
  });

  expect(html).toContain('<h1>Today</h1>');
  expect(html).toContain('Write tests');
});
```

```js
renderView({ template, viewData = {}, refs = {}, renderChildren })
```

- `template` is required. Pass it as loaded from YAML, or parsed with `parseTemplate`.
- `refs` is optional. No event listener is built, so handler and action names need no handlers and no store.
- `renderChildren(vnode)` is optional. Return a string to write it as that element's children, unescaped, or `null` to render the element's own children.
- The result is wrapped in `<div style="display: contents">`, the component's render target.
- Text and attribute values are escaped.
- `?disabled=${isBusy}` writes `disabled=""` when the value is true and nothing when it is false.
- Property bindings (`:items=${items}`) write nothing, because a property is not markup. Use `parseView` to assert on them.
- Child components are written as their tag only.

### Asserting on the Tree

`parseView` returns the virtual DOM tree, with properties and listeners on it.

```js
import { h } from 'snabbdom/build/h.js';
import { expect, vi } from 'vitest';
import { parseTemplate, parseView } from '@rettangoli/fe/testing';

const handleSelectItem = vi.fn();
const vnode = parseView({
  h,
  template: parseTemplate(view.template),
  viewData: { title: 'Today', items },
  refs: view.refs,
  handlers: { handleSelectItem },
});

const list = vnode.children[1];
expect(list.data.props.items).toBe(items);

list.data.on.click({ type: 'click' });
expect(handleSelectItem).toHaveBeenCalledTimes(1);
```

```js
parseView({ h, template, viewData, refs, handlers, wireEventListeners = true })
```

- `h` is snabbdom's `h`. In plain Node, import it from `snabbdom/build/h.js`: the `snabbdom` entry reads `window` when it is imported. Add `snabbdom` to your own dependencies.
- `template` must be parsed with `parseTemplate` first.
- A `handler` listener calls `handlers[name](payload)`, with the event in `payload._event`.
- An `action` listener calls `handlers.handleCallStoreAction(payload)`, with the action name in `payload._action`. A view with action listeners needs that function, or `parseView` throws.
- `wireEventListeners: false` builds no listeners and needs no `handlers`.

## Testing a Store

`bindStore` gives a store the same binding a component gives it: selectors read the state, and actions run through [Immer](https://immerjs.github.io/immer/).

```js
import { expect, it } from 'vitest';
import { bindStore } from '@rettangoli/fe/testing';
import * as todoStore from './todoList.store.js';

it('adds an item', () => {
  const store = bindStore(todoStore, { listId: 'today' }, { maxItems: 10 });

  const before = store.getState();
  store.addItem({ label: 'Write tests' });

  expect(store.selectViewData().items).toHaveLength(1);
  expect(before.items).toHaveLength(0);
  expect(() => store.addItem('Write tests')).toThrow(
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
- A payload that is not a plain object throws.
- An action that throws leaves the state as it was.
- Each `bindStore` call has its own state.

## Testing a Handler

A handler is a function of `(deps, payload)`. Call it with a real store and a spy for `render`. Handlers call `render()` themselves, so the spy tells you whether the handler asked for a render.

```js
import { expect, it, vi } from 'vitest';
import { bindStore } from '@rettangoli/fe/testing';
import * as todoStore from './todoList.store.js';
import { handleAddItem } from './todoList.handlers.js';

it('adds the item and renders', () => {
  const store = bindStore(todoStore, { listId: 'today' }, { maxItems: 10 });
  const render = vi.fn();

  handleAddItem({ store, render }, { label: 'Write tests' });

  expect(store.getState().items).toHaveLength(1);
  expect(render).toHaveBeenCalledTimes(1);
});
```

`deps` holds only what the test puts in it. Add `props`, `constants`, `refs`, `dispatchEvent` or your own dependencies when the handler reads them.

## Testing a Component

`createComponent` returns a class that extends `HTMLElement`, so it needs a DOM: a browser, or jsdom. jsdom has no constructable stylesheets, so define `CSSStyleSheet` before mounting.

```js
// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { createComponent, parseTemplate } from '@rettangoli/fe/testing';

beforeEach(() => {
  vi.stubGlobal('CSSStyleSheet', class { replaceSync() {} });
});

it('renders after an action listener', () => {
  customElements.define(
    'todo-list',
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

  const element = document.body.appendChild(document.createElement('todo-list'));
  element.renderTarget.querySelector('#addButton').click();

  expect(element.store.getState().items).toHaveLength(1);
});
```

```js
createComponent({ schema, view, store, handlers, methods, constants }, deps)
```

- `schema` and `view` are required. `view.template` must be parsed with `parseTemplate`.
- `deps` is the custom dependencies handlers receive.

jsdom does not lay out or paint. For behavior that depends on a real browser, use [Rettangoli VT](/vt/docs/introduction/quickstart).
