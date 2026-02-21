---
template: tui-documentation
title: Runtime & Component Model
tags: documentation
sidebarId: tui-runtime-component-model
---

`@rettangoli/tui` follows the same component architecture as `@rettangoli/fe`:

- schema contract in `.schema.yaml`
- declarative view in `.view.yaml`
- state/actions/selectors in `.store.js`
- orchestration in `.handlers.js`

## Component creation

```js
import { createComponent } from "@rettangoli/tui";

const ComponentClass = createComponent(
  { schema, view, store, handlers, methods: {}, constants: {} },
  deps.components,
);
```

`createComponent` compiles schema + view + store + handlers into a component class that the TUI runtime can instantiate.

## Runtime creation

```js
import { createTuiRuntime } from "@rettangoli/tui";

const runtime = createTuiRuntime({
  componentRegistry: {
    [schema.componentName]: ComponentClass,
  },
});
```

Runtime API:

- `registerComponent(name, classRef)`
- `createInstance({ componentName, attributes, props })`
- `render({ componentName, attributes, props })` for static output
- `start({ componentName, attributes, props, quitKeys, footer })` for interactive session

## Render modes

Static render:

```js
const output = runtime.render({
  componentName: "my-dashboard",
  props: { environment: "ci" },
});
console.log(output);
```

Interactive render:

```js
await runtime.start({
  componentName: "my-dashboard",
  props: { environment: "local" },
  quitKeys: ["q"],
  footer: "[q] quit",
});
```

## Event model

Use `refs.window` in the view to capture keyboard input:

```yaml
refs:
  window:
    eventListeners:
      keydown:
        handler: handleTerminalKeyDown
```

In handlers, use payload `_event` and call store actions, then `deps.render()`:

```js
export const handleTerminalKeyDown = (deps, payload) => {
  const event = payload?._event;
  if (event?.name === "r") {
    deps.store.refresh();
    event.preventDefault?.();
  }
  deps.render();
};
```

## Runtime deps available in interactive mode

When started with `runtime.start(...)`, handlers can use:

- `deps.stop()` to end the session
- `deps.openExternalEditor(options)` to suspend TUI, open editor, then resume

## Notes

- Browser-only APIs (DOM, Custom Elements rendering, CSS layout) are not used.
- Rendering is string/line based with ANSI styling and overlay support.

