# Prerendering And Hydration

A component tree can be rendered to HTML when a site is built, and the
browser bundle then adopts that HTML instead of drawing the page again. Each
page is a static file that paints with its content before any application
JavaScript runs.

Pages are rendered once, at build time, typically by `rtgl sites` (see its
README's prerendered components section). They are not rendered per request:
the build renders the same page for every visitor, and the contract below
relies on that.

Available from `@rettangoli/fe` 1.6.0.

## Rendering At Build Time

`@rettangoli/fe/server` is importable in plain Node, with no DOM. It is named
for where it runs, not for a server: build tools call it.

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
  methods. It `MUST NOT` import handlers: they never run at build time, so
  they may use browser APIs. A component marked `ssr: false` has no module
  imported at all. A new `reload` token imports edited stores and methods
  again in a long-running build, such as a watch; modules they import stay
  cached.
- `renderComponent` runs each component's `createInitialState` and
  `selectViewData`, renders its view, recurses into registered child
  components, and writes every component into its own declarative shadow
  root (`<template shadowrootmode="open">`). Each prerendered host is marked
  `data-rtgl-hydrate`.
- Handlers are never invoked at build time, so `handleBeforeMount` cannot
  seed state the build sees.
- With `serializeProps: true`, the root's schema props are written as JSON
  in a `<script type="application/json" data-rtgl-props>` beside its shadow
  root, and marks the host `data-rtgl-props`. A root has no parent on the
  client to pass it props, so this is how it gets the inputs the build used.
  Only values passed in `props` are written. A value the root reads from one
  of its `attributes` stays an attribute on the host, where the client reads
  it the same way and later attribute changes still apply. Serialized props `MUST` be JSON data (plain objects and arrays of strings,
  finite numbers other than -0, booleans and null, with no holes or cycles);
  anything else throws, because JSON would hand the client a different value.
- Child props are never serialized: the parent's render on the client
  recomputes them, as real values (objects, functions), before the child
  upgrades. See [Registration order](#registration-order).

## The First Render Contract

The client's first render of a prerendered component `MUST` be a pure
function of the same inputs the build used:

| Input | Where it comes from |
| --- | --- |
| `props` | the parent's render, or the serialized root props |
| `constants` | `.constants.yaml` (and setup constants) |
| `state` | `createInitialState({ props, constants })` |
| `i18n` / `locale` | the i18n runtime |

`createInitialState` and `selectViewData` `SHOULD NOT` read the clock,
`Math.random`, `window`, `location` or storage. Values like these differ
between the build and the browser, and the difference is silent: hydration
corrects it and the page still looks right, but the prerendered markup for
that subtree is thrown away. Pass such values as props, or set them after
mount. A guarded read such as `globalThis.window?.innerWidth ?? 1024` is the
worst case, because it doesn't fail at build time; it quietly differs.

The build renders one page for every visitor, so it can't know the viewport,
the pointer type, the visitor's theme or whether they are signed in. Render
what is the same for everyone (a loading or signed-out state) and fill in the
rest after mount. Layout that depends on the viewport or the pointer belongs
in CSS, so the markup is the same for everyone and the browser decides the
layout.

`handleBeforeMount` runs before the first client render. State it sets is a
mismatch unless it equals what the build rendered. There is no `isSsr` flag
to branch on: handlers don't run at build time at all. A value the first
render needs belongs in the store or in props, not in a handler.

## Hydration In The Browser

- On its first render, a host marked `data-rtgl-hydrate` diffs its view
  against the prerendered nodes instead of creating new ones. Matching nodes
  are kept; attributes, classes and text are corrected where the client
  renders them differently; listeners are bound and child props are assigned
  on the prerendered elements.
- A subtree whose structure differs (a different tag or child count) is
  replaced by a fresh client render. A custom element whose children differ
  is replaced whole, because elements such as `rtgl-popover` restructure their
  own light DOM and only a fresh element sets that structure up again. The
  same goes for every custom element around it, up to the nearest plain
  element, so in a tree of `rtgl-view`s one difference usually re-renders the
  whole component. Attributes a custom element sets on itself are left alone.
- Nodes are paired by position. A keyed list in a different order than the
  one prerendered is corrected item by item, not moved.
- Text the HTML parser joined (adjacent text items, or a `$for` over text) is
  split back into one node per item, and empty text is restored, so it
  adopts. Markup the parser rewrites can't adopt: an element it moves (a
  `tr` written straight into a `table` gets a `tbody`) re-renders that
  subtree. Write views the way the parser reads them.
- A child that isn't defined yet when its parent hydrates receives props
  named like native properties (`title`, `hidden`, `lang`) as values, not
  through the native setters. When it upgrades it reads the ones it
  declares, and the rest go through the native setters then. A prop written
  in attribute form (`title=Hi`) is an attribute already and uses the native
  setter. Outside a hydrating patch, props are assigned as they always were.
- The prerendered `<style>` copy is removed once the adopted stylesheets hold
  the same rules.
- A marked host whose render target is empty is compared too: it counts as
  hydrated when the client renders nothing either, and as a mismatch when
  the client renders something. The marker is removed after the first
  render either way.
- If a first patch throws, the render target is cleared and the component
  renders once more from scratch on the next frame, so it never stays half
  built or empty.
- Unmarked components behave exactly as before.

The page `MUST` load the bundle as a module script without `async`: the
markup and the root's props script have to be parsed before the components
are defined.

The page `SHOULD` load the `@rettangoli/ui` bundle as a blocking script in
`<head>`, so prerendered `rtgl-*` elements upgrade as they are parsed and
paint styled. Deferred, they paint unstyled and then reflow. Every
prerendered shadow root carries the shared `:host { display: contents; }`
rule, which the runtime also sets after upgrade, so hosts lay out the same
before and after the bundle runs. Don't give a host a `display` of its own
in the page's CSS: it would win before the upgrade and lose after it.

### Registration order

Prerendered hosts are in the document before the bundle runs, so each
upgrades the moment its element is defined. A child's props come from its
parent's patch, which assigns them as element properties; an element keeps
properties set before it upgrades. So when the document contains a
`data-rtgl-hydrate` host, the generated entry defines components parents
first (derived from the tags each view renders), and a child upgrades after
its parent's hydrating patch has assigned its props. Without prerendered
markup the order stays the default (categories, then components,
alphabetically). Components whose views name each other's tags (a cycle,
such as a view that shows another only under a condition) keep their
default order after the rest; they still render correctly, at the cost of
a mismatch.

### Telemetry

Every hydrated host is counted on `globalThis.__rtglHydration`:

```js
{ hydrated: 12, mismatched: 1, reasons: ["<app-page> div > ul[0]: expected 3 child node(s), found 2"] }
```

A host counts as `mismatched` when any of its nodes had to be replaced or
corrected. Apps `SHOULD` assert `mismatched === 0` in a browser test of their
prerendered pages, because a mismatch is otherwise invisible: the page is
corrected and looks right.

## Opting Out

A component that cannot be prerendered (canvas, WebGL, editors) sets
`ssr: false` in its schema (see `schema.md`). It is emitted with no shadow
root and no hydration marker, and mounts on the client as usual. The light
DOM its parent gives it is still written, so the parent adopts it. An
opted-out root rendered with `serializeProps` still gets its props.

A component can't be prerendered inside itself, such as a tree that renders
its own tag for its child nodes: `renderComponent` throws
`component cycle detected`. Mark it `ssr: false`; its parent's markup is
still prerendered, and the tree renders in the browser.

## Design Notes

Why it works the way it does.

- **One declarative shadow root per component.** A component attaches its own
  shadow root when it upgrades, so a subtree written into its light DOM would
  be unslotted and lost. Its own shadow root lets each component adopt its
  own output.
- **One marker, no payload.** The only markup added is `data-rtgl-hydrate` on
  hosts, plus the root's props script. There are no per-node keys or comment
  separators: the client's own vnode tree is paired with the DOM.
- **A first patch over the real DOM.** Snabbdom's `patch(element, vnode)`
  starts from an old vnode with no children, so it appends a second copy
  beside the prerendered one. The hydrating patch builds the old vnode from
  the live elements instead, with their real attributes and classes, so
  differences are corrected and listeners bind to the prerendered elements.
  Snabbdom's `toVNode` can't be used: it builds selectors as `tag#id.class`
  and drops keys, so `sameVnode` never matches the parser's vnodes.
- **Only the root's props are serialized.** Property bindings never reach the
  HTML. On the client the parent's render produces them again, as the same
  values, so children need no JSON and accept any type.
- **Light DOM that restructures itself can't be adopted.** `rtgl-popover`
  moves its children into a wrapper when it upgrades, so the client's vnodes
  no longer describe the DOM, and a subtree holding one re-renders instead.
  A component that owns that structure in its shadow DOM, around a slot,
  hydrates normally. Fixing `rtgl-popover` is on the roadmap.
