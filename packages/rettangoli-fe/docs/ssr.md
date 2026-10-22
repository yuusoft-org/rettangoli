# Server Rendering And Hydration

A component tree can be rendered to HTML ahead of time (at build time or on a
server) and then adopted by the browser bundle, so a page paints with its
content before any application JavaScript runs.

Available from `@rettangoli/fe` 1.6.0. The design and its measurements are in
`ssr-plan.md`. This file is the contract.

## Rendering On The Server

`@rettangoli/fe/server` is importable in plain Node, with no DOM.

```js
import { loadComponents, renderComponent } from "@rettangoli/fe/server";

const components = await loadComponents({ cwd, dirs: ["src/components", "src/pages"] });
const { html } = renderComponent({
  component: "app-root",
  components,
  props: { route: "/explore", snapshot },
  serializeProps: true,
});
```

- `loadComponents({ cwd, dirs, reload })` reads components the way
  `rtgl fe build` finds them. It loads views, schemas, constants, stores and
  methods. It `MUST NOT` import handlers: they never run on the server, so
  they may use browser APIs. A component marked `ssr: false` has no module
  imported at all. A new `reload` token imports edited stores and methods
  again in a long-running process; modules they import stay cached.
- `renderComponent` runs each component's `createInitialState` and
  `selectViewData`, renders its view, recurses into registered child
  components, and writes every component into its own declarative shadow
  root (`<template shadowrootmode="open">`). Each server-rendered host is
  marked `data-rtgl-hydrate`.
- Handlers are never invoked server-side, so `handleBeforeMount` cannot seed
  state the server sees.
- With `serializeProps: true`, the root's schema props are written as JSON
  in a `<script type="application/json" data-rtgl-props>` beside its shadow
  root, and marks the host `data-rtgl-props`. A root has no parent on the
  client to pass it props, so this is how it gets the inputs the server used.
  The server's precedence holds on the client: props over attributes.
  Serialized props `MUST` be JSON data (plain objects and arrays of strings,
  finite numbers other than -0, booleans and null, with no holes or cycles);
  anything else throws, because JSON would hand the client a different value.
  Child props are never serialized: the parent's render recomputes them.

## The First Render Contract

The client's first render of a server-rendered component `MUST` be a pure
function of the same inputs the server used:

| Input | Where it comes from |
| --- | --- |
| `props` | the parent's render, or the serialized root props |
| `constants` | `.constants.yaml` (and setup constants) |
| `state` | `createInitialState({ props, constants })` |
| `i18n` / `locale` | the i18n runtime |

`createInitialState` and `selectViewData` `SHOULD NOT` read the clock,
`Math.random`, `window`, `location` or storage. Values like these differ
between the server and the browser, and the difference is silent: hydration
corrects it and the page still looks right, but the server markup for that
subtree is thrown away. Pass such values as props, or set them after mount.

`handleBeforeMount` runs before the first client render. State it sets is a
mismatch unless it equals what the server rendered.

## Hydration In The Browser

- On its first render, a host marked `data-rtgl-hydrate` diffs its view
  against the server's nodes instead of creating new ones. Matching nodes are
  kept; attributes, classes and text are corrected where the client renders
  them differently; listeners are bound and child props are assigned on the
  server's elements.
- A subtree whose structure differs (a different tag or child count) is
  replaced by a fresh client render. A custom element whose children differ
  is replaced whole, because elements such as `rtgl-popover` restructure their
  own light DOM and only a fresh element sets that structure up again.
  Attributes a custom element sets on itself are left alone.
- Text the HTML parser joined (adjacent text items, or a `$for` over text) is
  split back into one node per item, and empty text is restored, so it
  adopts. Markup the parser rewrites can't adopt: an element it moves (a
  `tr` written straight into a `table` gets a `tbody`) re-renders that
  subtree. Write views the way the parser reads them.
- A child that isn't defined yet when its parent hydrates receives props
  named like native properties (`title`, `hidden`, `lang`) as values, not
  through the native setters, and keeps them until it upgrades.
- The server's `<style>` copy is removed once the adopted stylesheets hold the
  same rules.
- A marked host with nothing to adopt renders normally. The marker is
  removed after the first render either way.
- If a first patch throws, the render target is cleared and the component
  renders once more from scratch on the next frame, so it never stays half
  built or empty.
- Unmarked components behave exactly as before.

The page `MUST` load the bundle as a module script without `async`: the
markup and the root's props script have to be parsed before the components
are defined.

### Registration order

Server-rendered hosts are in the document before the bundle runs, so each
upgrades the moment its element is defined. When the document contains a
`data-rtgl-hydrate` host, the generated entry defines components parents
first (derived from the tags each view renders), so a child upgrades after
its parent's hydrating patch has assigned its props. Without server markup
the order stays the default (categories, then components, alphabetically).
Components in a cycle keep their default order after the rest; they still
render correctly, at the cost of a mismatch.

### Telemetry

Every hydrated host is counted on `globalThis.__rtglSsr`:

```js
{ hydrated: 12, mismatched: 1, reasons: ["<app-page> div > ul[0]: expected 3 child node(s), found 2"] }
```

A host counts as `mismatched` when any of its nodes had to be replaced or
corrected. Apps `SHOULD` assert `mismatched === 0` in a browser test of their
prerendered pages, because a mismatch is otherwise invisible.

## Opting Out

A component that cannot render on the server (canvas, WebGL, editors) sets
`ssr: false` in its schema (see `schema.md`). It is emitted with no shadow
root and no hydration marker, and mounts on the client as usual. The light
DOM its parent gives it is still written, so the parent adopts it. An
opted-out root rendered with `serializeProps` still gets its props.
