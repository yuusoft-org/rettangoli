# SSR for @rettangoli/fe — implementation plan

Status: Parts A and B1 implemented; B2–B4 remain a proposal backed by a
working prototype.
Scope: framework-level (`@rettangoli/fe`).

The prototype and its test suite live outside this repo, in the app used to
validate the design:

    RouteVN/routevn-creator-client/ssr-poc/

Every measurement below comes from that prototype running against a real
consumer app (108 views, 75 components, 33 pages). Paths of the form
`rvn-app` / `rvn-projects` are that app's components, cited as evidence rather
than as part of the design.

---

## 0. Status

**Part A is implemented and merged into `packages/rettangoli-fe`. Stage B1 is
also implemented:** the Node-safe entry now resolves a caller-supplied
component registry, runs each component store, recursively renders registered
child tags, and emits nested declarative shadow roots. Hydration and consumer
adoption (B2–B4) remain separate decisions.

What shipped:

| | |
|---|---|
| `src/web/vendor/snabbdomStyleModule.js` | vendored from snabbdom 3.6.2; two lines changed so `raf` resolves lazily |
| `src/core/component/resolveComponentDefinition.js` | moved out of `createComponent.js`, off the patch's import graph |
| `src/core/server/serializeVNode.js` | namespace-aware vnode → HTML serializer |
| `src/server/index.js` | the Node-safe entry |
| `src/server/renderer.js` | recursive renderer + document wrapper (B1) |
| `src/core/style/commonComponentStyles.js` | shared web/server shadow-root styles |
| `src/web/componentDom.js` | render-target adoption hardened; inline styles no longer clobbered |
| `package.json` | Node-safe `./server` export |

Current verification: **378 tests** in `@rettangoli/fe`, including five HTML
goldens, recursive parent/child output, deterministic cycle/depth failures, and
schema-level `ssr: false` coverage. The package smoke test packs, installs, and
imports the public server surface in bare Node. FE browser coverage now has
eight VT specs across the `dashboard` and `interactions` examples in the
`ci-ui.yaml` matrix.

The headline result:

```
$ node -e "import('@rettangoli/fe')"
# before: ReferenceError: window is not defined
# after:  resolves
```

Two decisions from §10.0 were resolved during implementation:

- **Decision A → vendor the style module.** Confirmed the reviewed diagnosis:
  the throw is at *module evaluation*, so no amount of lazy instantiation helps.
  Only 2 of 113 lines touch `window`.
- **§5.6 template normalization → do not change the code.** The reviewed claim
  that the pass is not idempotent is correct, but the build inlines the *raw*
  AST and normalization runs once per template object at runtime, so there is
  no live bug.

  Two fixes were attempted and both rejected on evidence. Relaxing the
  validator to accept the normalized form would loosen authoring semantics.
  And a friendlier "this template is already normalized" error turns out to be
  impossible: `:value=title` is simultaneously what the normalizer produces
  **and** legitimate legacy author syntax that the framework deliberately
  rejects (`loop-property-binding.test.js`, "rejects legacy property-form
  source syntax"). The two are byte-identical, so any special-casing would
  mislead the far more common case. That attempt broke an existing test, which
  is how it was caught.

  The constraint is captured in `test/runtime/template-normalization.test.js`,
  including a test asserting the two cases produce the *same* message, so the
  reason it cannot be improved is recorded rather than rediscovered.

**Decision B (`rtgl-popover`) remains open** and only blocks Part B stage B4.

---

## 1. Summary

### 1.1 This is two projects, not one

Read the rest of this document with that split in mind. Conflating them is what
makes the scope look larger and riskier than it is.

**Project A — make the framework renderable outside a browser.**
Finish the core/binding separation the framework already started, and add a
vnode→HTML serializer. Small, low-risk, and **commits you to nothing about
SSR**. Worth shipping on its own merits: it makes the package importable in
Node, gives the project HTML golden tests it currently has none of, and fixes
three latent bugs.

**Project B — SSR itself.**
The recursive renderer (B1) now exists. Hydration, registration order,
telemetry, parity gates, and app adoption remain. Those later stages are the
genuine product bet with an ongoing maintenance cost, because hydration
mismatches fail silently rather than loudly.

The original sequencing recommendation was followed: A shipped before B1, so
the renderer reuses the extracted definition/store/parser/serializer path
instead of maintaining a second component-construction implementation. The
remaining separate decision is whether to take on B2 and its parity gate.

Sections below are tagged **[A]** or **[B]** accordingly.

### 1.2 What B delivers, if you do it

Server-render `@rettangoli/fe` components to HTML, paint that HTML before any
application JavaScript runs, then have the client **adopt** it rather than
rebuild it.

A prototype of the full path exists and works. Measured in Chromium at 4× CPU
throttle:

| | first contentful paint | pre-JS UI | hydration |
|---|---|---|---|
| today | ~1600 ms | blank | — |
| prototype | **~120 ms** | fully styled, correct layout | `hydrated=5 mismatched=0` |

The prototype renders the app shell and route page in bare Node with no DOM
shim, no headless browser, and no prop serialization. Server output is 7.7 KB
against a 596-byte shell today — roughly 1.5 KB gzipped, ~0.1% of the bundle.

**What this buys:** the page looks correct almost immediately instead of being
black for ~1.6 s.

**What it does not buy:** time-to-interactive is unchanged, and data the server
cannot see still arrives when it arrives. This is a perceived-quality change,
not a performance one. That distinction should survive into how it is
described internally.

---

## 2. How it works

### 2.1 Rendering

The render path is already environment-agnostic. `parseView` takes `h` by
injection and never inspects its return value, so the server calls the same
parser the browser does and serializes the resulting vnode tree:

```
createInitialState → selectViewData → parseView → serializeVNode → HTML
```

Handlers are never invoked server-side. The output is the component's initial
state — chrome, empty states, loading states.

Because components are wired by **tag name** rather than by import, the
renderer must resolve tags itself and recurse. Without recursion the entire
app shell serializes to 688 bytes of empty custom elements; with it, 6.5 KB of
real UI.

### 2.2 Markup shape

Every component gets its **own** declarative shadow root:

```html
<rvn-app data-rtgl-hydrate="true">
  <template shadowrootmode="open">
    <div data-rtgl-render-target style="display: contents">
      <rtgl-view d="h" w="f" h="f">
        <rvn-projects data-rtgl-hydrate="">
          <template shadowrootmode="open">
            <div data-rtgl-render-target style="display: contents">
              …
```

Nesting matters. Each component attaches its own shadow root on upgrade, so a
child whose subtree was written into its *light* DOM has that subtree
unslotted and discarded the moment it upgrades. Per-component shadow roots are
what let each one adopt its own output.

The only SSR-specific markup is `data-rtgl-hydrate` on component hosts. No
per-node keys, no comment separators, no JSON payloads.

### 2.3 Why it paints before the app bundle

The UI primitive bundle is a **blocking** `<script>` in `<head>`, so all
`rtgl-*` elements are defined before `<body>` is parsed. Server-emitted
`rtgl-view`/`rtgl-text` therefore upgrade at their start tag and paint fully
styled, with no application JavaScript involved.

> **Do not add `defer` to the UI bundle.** Measured: blocking gives FCP ~120 ms
> with a correct full-viewport layout; deferred gives a faster FCP number but
> paints a 130×22 px blob at top-left that then reflows. The blocking script is
> what makes prerendering free.

One CSS rule is required, or the host is an unknown element (`display: inline`)
and the tree collapses to a ~14 px strip:

```css
rvn-app { display: block; height: var(--rvn-app-viewport-height, 100vh); min-height: 0; }
```

This rule already ships in `static/ios/index.html`; it is simply absent from
the web shell.

### 2.4 Hydration

The client's first patch must diff against the server DOM, not append beside
it. Snabbdom's `patch(element, vnode)` calls `emptyNodeAt()`, which synthesises
an old vnode with `children: []` — so `updateChildren` only ever calls
`addVnodes` and the server tree survives untouched *next to* a second copy.
This was reproduced: it is visibly corrupt, not subtle.

The fix is a structural zip: walk the freshly computed vDom and the live DOM in
parallel, mirror the client's own `sel`/`key` onto the old vnode, and point
`elm` at the real node. Leave `data` empty so every snabbdom module treats each
node as new — attributes re-applied idempotently, props assigned, and
`eventListeners` sees `oldOn === undefined` and binds every listener to the
**server's** elements.

Snabbdom's shipped `toVNode` cannot be used: it builds `sel` as
`tag#id.class` while the parser emits a bare tag, and never restores
`data.key`. Both make `sameVnode` fail.

On any structural divergence the zip returns `null` and that subtree falls back
to a normal client render.

> **CORRECTION (review, 26 Jul).** An earlier draft claimed "mismatches cost
> the benefit, never correctness". **That was false as implemented.**
> `initializeComponentDom` adopts an existing `[data-rtgl-render-target]` and
> never clears it, so the fallback `patch(renderTarget, vDom)` runs
> `emptyNodeAt` → `children: []` → `addVnodes` and **stacks the client tree
> beside the surviving server tree** — precisely the corruption this document
> holds up as the cautionary case. Reproduced in Chromium: the prototype's
> `/project/variables` run showed 4 render-target roots against a baseline of 2.
>
> The fix is one line and is now **required work in §5.3**: on an SSR-marked
> host, `renderTarget.replaceChildren()` before any non-hydrating first patch.
> Verified: 4 roots → 2. The same reset is needed on the throw path, where
> `componentOrchestrator.js` returns `instance._oldVNode || null` and can leave
> a partially-patched DOM.
>
> With that reset in place the property holds. Without it, it does not — and the
> incremental-adoption argument depends on it, so it must land with §5.3 rather
> than after.

Three further divergence classes the zip currently accepts and reports as clean
(all verified, all must be closed in §5.3):

1. **The zero-children branch never reads the DOM.** A server-rendered populated
   list under a client-rendered empty state survives forever at
   `mismatched=0`. Require `domChildren.length === 0` or bail.
2. **`data: {}` never removes anything.** snabbdom's attributes module only
   deletes keys present in the *old* data, so any attribute the server emitted
   and the client does not is permanent. Build the old vnode's
   `attrs`/`class`/`style` from the real element, keeping `props` and `on`
   empty so props and listeners still bind.
3. **The zip is positional, not keyed.** A reordered keyed list zips
   "successfully" against the wrong nodes. Verify the key against a serialized
   attribute, or state explicitly that keyed lists are not hydrated.

**`data.hook` is also unhandled.** `parser.js` attaches
`createComponentUpdateHook` as `data.hook` on every web-component vnode.
Adopted elements are patched, never created, so `insert` — which seeds the
props snapshot — never runs, and `update` sees `oldProps = {}`, reports every
prop changed, stamps `isDirty` and forces a redundant re-render of every
already-correct child. The fix is to seed the hook's snapshot for adopted hosts
at zip time, which needs a small export from `componentUpdateHook.js` and is
**not** inside §5.3's stated line budget.

---

## 3. Props — no serialization required

This was the main open question and the answer is that there is nothing to
build.

Property-form bindings (`:items=${obj}`) land only in `data.props`. The
serializer ignores `data.props` entirely, so they contribute **zero bytes**:

```yaml
- demo-child :user=${user} :tags=${tags} :onPick=${onPick} label=static: null
```

```html
<demo-child label="static" data-rtgl-hydrate="">…</demo-child>
```

Yet the rendered output contains `Ada Lovelace`, three `<li>` tags from the
array, `memberSince=1843` (requiring a live `Date`) and `fnResult=picked:t2`
(requiring a live **function**). The server passed the real object graph in
memory; the HTML is a picture of the output, never a container for the inputs.

The client obtains the same values by re-running the parent's render.
`propsModule` assigns `elm.items = [...]` as a plain JS property while the
child's tag is still undefined; `installReactiveProps` (`props.js:107-120`)
captures pre-set own properties on upgrade and preserves them.

**Therefore:** no JSON island, no escaping hazard, no type restriction. Objects,
arrays, `Date`s, `Map`s and functions all survive because nothing is stringified.

### The catch: registration order

This only holds if the parent renders before the child upgrades.
`frontendEntrySource.js:196` sorts categories alphabetically, so `components`
register before `pages` — and in the validating app the pages are the parents. Children
were upgrading and running their first render with **no props assigned**.

That single ordering bug was the prototype's only hydration mismatch. Fixing it
took the result from `hydrated=4 mismatched=1` to `hydrated=5 mismatched=0`,
with zero markup changes.

The real fix is a **topological sort** of the tag-reference graph, which the
codegen can derive since it already parses every view. Cycles fall back to
`defer-hydration` (§5.4).

---

## 4. The contract

> **The client's first render must be a pure function of the same inputs the
> server used.**

Three things satisfy it:

| | how |
|---|---|
| same props | registration order — element properties survive upgrade |
| same store logic | free, it is the same code |
| **same inputs to that logic** | the part you must maintain |

### 4.1 The four inputs — no new ones

The contract needs **no additions to the framework**. Every input already
exists:

```js
// store   (store.js:11-17)                  // handler  (lifecycle.js:1-13)
{ state, props, constants, i18n, locale }    { ...deps, refs, dispatchEvent, store, render }
```

| input | origin |
|---|---|
| `props` | the parent |
| `constants` | the component's `.constants.yaml` |
| `state` | the component itself |
| `locale` / `i18n` | the framework's i18n runtime |

Stores get **values**; handlers get **services**. That separation is already
enforced by the framework — a store cannot reach `deps` even if it wants to.

**The rule: the first render must never depend on `deps`.**

Every bug found during prototyping is a violation of this rule, not a gap in
it:

- `platform: "tauri"` hardcoded, then corrected from `appService` in a handler
  — a fifth, undeclared input
- `globalThis.window?.innerWidth ?? FALLBACK` in a selector — a sixth

#### A fifth input was considered and rejected

An earlier draft proposed a render-scoped ambient bag (`env` / `renderContext`)
to carry platform, theme and route into stores. It was dropped after checking
what would actually use it:

| candidate | verdict |
|---|---|
| `platform` | **per-build, not per-render.** The server only ever renders for web; the client's platform is fixed by which `setup.<target>.js` was bundled. Resolve it at build time. |
| viewport / pointer type | **the server cannot know it.** No channel helps; this is the CSS-or-post-hydration tradeoff in §9. |
| route | **already in app state.** A store reading `window.location` is a bug independent of SSR — pass it as a prop. |
| theme | not per-request today; it is a `<body>` class. |
| locale | already owned by the i18n runtime. |

Nothing left. Adding an input would have legalised the violations rather than
fixing them, and would have grown the contract from four inputs to five for no
consumer that needs it.

Note also that `resolveConstants` currently merges `deps.constants` from setup
with the component's `.constants.yaml`. Two invisible origins under one name is
the same class of ambiguity; `setupConstants` should be deprecated so
`constants` means the YAML file and nothing else.

### 4.2 No `isSsr` flag — anywhere

Handlers are not invoked server-side at all. It is non-execution, not
branching, so no guard is needed.

If a handler seeds state that affects the first render, move it into the store
rather than guarding it:

```js
// before
createInitialState: () => ({ platform: "tauri" })          // a lie on web
handleAfterMount: () => store.setPlatform(appService.getPlatform())

// after — platform resolved at build time, no service call, no new input
createInitialState: () => ({ platform: PLATFORM })
// handler line deleted
```

The handler gets *smaller*, and the client stops rendering once with the wrong
value and correcting itself.

`if (deps.isSsr)` should not be reachable. Every other failure mode in this
system is caught by a test; a branch is caught by nothing, because both sides
are individually "correct" and quietly different. Recommendation: **do not
expose the flag at all.**

Components that genuinely cannot render server-side (canvas, Lexical, WebGL)
opt out **declaratively**, not imperatively:

```yaml
componentName: rvn-scene-editor-lexical
ssr: false
```

The renderer emits a bare host with no shadow root and no hydrate flag; the
client mounts it exactly as today.

---

## 5. Framework changes (`yuusoft/rettangoli`)

All additive. Nothing changes for existing consumers who do not opt in.

### 5.0 [A] Separate the component core from its DOM binding — **required, first**

SSR adds a second binding of the same component construction sequence. If that
sequence is written independently for the server, it will drift from the web
one — and drift in the parser's key generation is a *silent hydration bug*, not
a visible one: the tree simply stops adopting and falls back to CSR with no
error.

The entanglement is already causing a concrete failure today, with no SSR
involved:

```
$ node -e "import('@rettangoli/fe')"
ReferenceError: window is not defined
```

`createComponent.js:7` instantiates `createWebPatch()` at module scope, and
snabbdom's style module dereferences a bare `window` at import time. That single
line blocks every Node-side tool — including the HTML golden tests in §6, which
the framework currently has none of.

Most of the seams already exist and are simply unused:

- `resolveComponentDefinition` (`createComponent.js:9-46`) is already pure and
  already exported — it just lives in a module that pulls in the patch.
- `componentDom.js:66-68` accepts `createStyleSheet` and `createElement`
  factories, but both production call sites
  (`createWebComponentClass.js:178, :265`) ignore them and fall back to globals.
- snabbdom's `init(modules, domApi)` accepts a custom DOM API;
  `createWebPatch.js` hardcodes the default.

Work:

1. Move `resolveComponentDefinition` into `core/`, off any graph that imports
   `createWebPatch`.
2. Make the package importable in Node. **See the correction below — the
   obvious fix does not work.**
3. Extract the construction sequence — store binding, props, constants,
   lifecycle wiring — into `core/`, so the web and server bindings share it
   rather than each owning a copy.
4. Thread the existing `componentDom.js` factories through from the call sites.

> **CORRECTION (review, 26 Jul).** An earlier draft prescribed "make the patch
> lazy (`patch ??= createWebPatch()`)". **That does not work**, verified three
> times independently. The `ReferenceError` is thrown while *evaluating*
> `snabbdom/build/modules/style.js`, whose line 2 dereferences a bare `window`
> at module scope — not while *calling* `createWebPatch()`. The blocking edge is
> the static `import` in `createComponent.js`, and `web/hotComponentRegistry.js`
> sits downstream of the same import rather than being a second edge.
>
> **OPEN DECISION — pick one before starting A1:**
>
> **(a) Vendor snabbdom's style module.** It is 113 lines, of which exactly
> **two** touch `window`. Guarding them (`globalThis.window?.…`) makes it import
> cleanly in Node — verified. Keeps `createComponent` synchronous, keeps the
> exit criterion as `import('@rettangoli/fe')`. Cost: maintaining a copy of a
> snabbdom internal.
>
> **(b) Keep `.` browser-only.** Expose the Node surface solely through the new
> `./server` and `./parser` entries. No vendoring, but the main entry stays
> un-importable in Node and the exit criterion weakens to
> `import('@rettangoli/fe/parser')`.
>
> **(c) Make `createComponent` async.** Rejected: `frontendEntrySource.js` emits
> `customElements.define(elementName, createComponent(...))` inline, so this is a
> breaking change for every consumer's generated entry.

**Scope correction.** This section was sized against `@rettangoli/fe` 1.2.3. The
repo is 1.3.0, and HMR landed in `e9d482cd`: `createWebComponentClass.js` grew
195 → 376 lines and `store.js` 50 → 149. The construction sequence now exists
**twice** — the cold constructor and the hot-update path — and both must move to
`core/` together or `rtgl fe watch` regresses. A1 is real work, not a
half-day. Name `test/runtime/create-component.contract.test.js` and
`hot-component-registry.test.js` as the regression net and an A1 exit criterion.

Exit criteria: the Node-import decision above is implemented and its criterion
met; the cold and hot construction paths both live in `core/`; the existing
runtime contract tests still pass.

Doing this **before** §5.1–5.4 is materially cheaper than retrofitting it after
a second binding exists.

### 5.1 [A] A vnode → HTML serializer — **required**

`snabbdom-to-html@7.1.0` is not usable: last published 2022, CI targeting
Node 4/5/6, and it stringifies `data.props` into lowercased attributes. On this
app's own tree it emits both `h-bc="ac"` and `hbc="ac"` on the same element,
plus `[object Object]` for object props. Those names are in `observedAttributes`,
so `attributeChangedCallback` would overwrite real props with garbage on
upgrade.

Requirements, each verified by test:

- never emit `data.props`
- **preserve empty-string attributes** — rettangoli's boolean encoding
  (`attrs[name] = ""`); `snabbdom-to-html` drops them
- merge `data.class` and `data.style` into single attributes
- validate attribute names
- HTML5 void-element table
- **`<style>` and `<script>` are raw text**: emit verbatim, never escape.
  Escaping turns `.a > .b` into `.a &gt; .b`, which is not a selector. Since
  raw text cannot be escaped, refuse content containing `</style` or
  `</script` rather than emitting an injection.
- `<textarea>` and `<title>` are *escapable* raw text and stay on the normal
  escaping path. Getting this backwards is a classic bug.

### 5.2 [B] A recursive server renderer — **required**

Resolves tag → component, runs the store, calls `parseView`, recurses into
child components, emits per-component declarative shadow roots.

**Implemented.** `renderComponent` takes a root tag and an explicit
`components` registry. Registry values may be raw component configs, resolved
definitions, or `{ componentConfig, deps }` registrations; arrays, objects,
and Maps are accepted. No process-global registry or request state is used.

The implementation mirrors the browser's first-render inputs:

- schema-declared props only, including attribute fallback
- setup/component constants through `resolveConstants`
- `createInitialState` and `selectViewData` through `bindStore`
- current i18n messages and locale service

Registered child tags recurse. Unregistered custom elements remain ordinary
markup. `ssr: false` emits a bare host without a shadow root or hydrate marker.
Cycles report the complete tag path, and `maxDepth` (default 100) bounds
acyclic recursion. Both failures throw deterministic errors so callers can
choose their shell fallback explicitly.

Each rendered component emits the shared shadow styles, its `.view.yaml`
styles, and a marked `data-rtgl-render-target` inside
`<template shadowrootmode="open">`. `renderDocument` wraps trusted renderer
markup in a complete document while escaping title and document attributes.

Still deliberately absent: DOM adoption, hydrating patch behavior,
registration ordering, telemetry, or any other B2 behavior.

### 5.3 [B] A hydrating first patch — **required**

Four things, not one. The line budget below covers the first only.

`buildHydrationVNode({ vDom, rootElm })`, ~90 lines, plus ~15 lines in
`componentOrchestrator.js` gated on the host attribute — inert for non-SSR
pages.

### 5.4 [B] Topological registration — **required**

Emit `customElements.define` calls parents-first, derived from the
tag-reference graph. `defer-hydration` covers cycles and any future
lazy/partial hydration: the server marks hosts, `connectedCallback` skips the
first render, the parent removes the attribute after its patch.

### 5.5 [B] Contract enforcement — **required**

No new store input (see §4.1). What is required instead is making the existing
four-input contract checkable, because a violation is silent by construction:

- **`rettangoli-check` rules** — no browser globals and no `Math.random` /
  `Date.now` inside `createInitialState` or `selectViewData`. The checker
  already parses every store and view, so this is a rule addition rather than
  new machinery. `ssr-poc/tests/ssr-hazards.test.js` is a working prototype of
  the analysis, including the literal-stripping needed to avoid flagging
  `` `document-${id}` ``.
- **`__rtglSsr = { hydrated, mismatched, reasons }`** exposed by the runtime,
  so consumers can gate CI on `mismatched === 0`.

This is the highest-value long-term item in the plan. A contract nobody can
violate is worth more than a contract with more slots.

### 5.6 [A] Exports, tooling, and three latent bugs — small

- A `"./server"` entry in the exports map. (Shipped as `./server` only: a
  separate `./parser` entry was dropped, because `renderView` supplies snabbdom's
  `h` and jempl's parser itself and callers no longer need the raw `parseView`.)
  This also removes a
  live hazard: `tests/support/renderView.js` reaches into
  `node_modules/@rettangoli/fe/node_modules/jempl` by path, binding a
  different jempl version than the app hoists — the test helper can compile
  templates with a different AST than the browser.
- `ssr: false` honoured from `.schema.yaml`.

Three small correctness fixes surfaced by validation, each a latent bug today
rather than an SSR-only concern:

- **`componentDom.js:50`** — `querySelector('[data-rtgl-render-target]') ??
  shadow.firstElementChild` will stamp a `<style>` as the render target in any
  shadow root that contains one. snabbdom then replaces it, leaving
  `instance.renderTarget` dangling. Restrict the fallback or drop it. Note the
  existing test at `component-dom.test.js:182` depends on the current
  behaviour.
- **`componentDom.js:90,94`** — clobbers `renderTarget.style.cssText` wholesale
  instead of setting `display` conditionally, wiping any inline style already
  on the element.
- **`parseView` template normalization.** *Re-scoped after review.* Two claims
  in the earlier draft were wrong. The concurrency justification does not hold —
  Node is single-threaded and the mutation cannot be observed mid-flight, so
  drop that reasoning. And the pass is **not idempotent**: it rewrites
  `:value=${title}` → `:value=title`, which
  `getPropertyBindingViolationForKey` then **rejects** — verified to throw when
  re-run on a clone of its own output. The `WeakSet` is therefore a correctness
  guard, not a memo, and a build-time-serialized AST arrives with a fresh object
  identity and re-enters the validator.

  So "normalize at build time" as written would break every property-binding
  view. Do the smaller, genuinely useful fix instead: make the validator accept
  the normalized forms so the pass becomes truly idempotent. Worth doing on its
  own merits.
- `javaScriptEnabled` threaded through `@rettangoli/vt` so the pre-JS render
  can be regression-tested at all.

### 5.7 Explicitly not needed

No `command: "server"` codegen arm (the parameter is binary at 21 call sites).
No change to `handleBeforeMount`'s synchronous contract. No prop serialization.
No `__INITIAL_STATE__`.

**Nothing in `@rettangoli/ui` for Part A.** Part B is a different matter, and an
earlier draft contradicted itself here: §9.1 makes an `@rettangoli/ui` change a
prerequisite for full hydration coverage. **OPEN DECISION — fix `rtgl-popover`,
or accept CSR fallback on subtrees containing one?**

The fix (move the content wrapper into shadow DOM around the slot) is verified
safe: it does not break `::part(content)` — that selector cannot match slotted
light DOM and nothing in the repo uses it — nor the ResizeObserver, nor the
`content-*` attribute mapping. But it touches a shipped component with five
internal consumers (tooltip, select, dropdown-menu, tag-select, popover-input)
that pass unnamed, variable-count children, while the published docs pass a
single `slot=`-named child. That fork is the real compat surface.

Accepting CSR fallback is legitimate: those subtrees render correctly, they just
get no SSR benefit. `rtgl-popover` appears in 13+ views.

**No new store input.** No `env`, no `renderContext`, no ambient bag, and no
new merging into `constants`. §4.1 records why: every candidate value turned
out to be per-build, already available, or unknowable to a server. The
framework's contract stays at four inputs.

---

## 6. Testing

Consistency here is not testable by inspection: a hydration mismatch is not an
error. It re-renders and looks correct. The suite has to be the gate.

The prototype started with 37 unit tests plus 8 browser checks. Framework-side
A/B1 coverage has now moved into this package: serializer cases, five HTML
goldens (including nested parent/child shadow roots), Node/package smoke tests,
schema opt-out coverage, repeated-render determinism, and stable cycle/depth
failures.

The remaining groups belong to B2/B4:

- static first-render hazard scans for browser globals and
  `Math.random`/`Date.now`, with an allowlist so new offenders fail loudly
- consumer-wide invariants over every store/component, beyond the framework
  fixtures now covered here
- the rebuilt browser hydration/adoption parity gate below

This catches what execution tests cannot. `globalThis.window?.innerWidth ?? FALLBACK`
does not throw in Node — it silently returns a different value than the client.
**Guarded browser access is more dangerous than unguarded**, because unguarded
fails loudly. Two real offenders found: `vnPreview`, `mobileSidebar`.

> **CORRECTION (review, 26 Jul).** The prototype's parity gate **cannot observe
> the failures it exists to catch**, so the "8/8 passed" result must not be
> cited until it is rebuilt. Two defects, both verified in Chromium:
>
> - It stamps `data-server-node` inside a `DOMContentLoaded` listener, but the
>   app is a `<script type="module">`, which executes **before** that fires. A
>   reviewer proved it reports success on a page that deliberately replaced
>   everything.
> - Its "server DOM was adopted" check passed while the tree was **duplicated** —
>   the server nodes survived precisely because they were stacked, not adopted.
>   After the §2.4 reset fix, the same check correctly flips to failing.
>
> A usable gate must: tag synchronously via `addInitScript` and hold node
> identity in a `WeakSet` (or a `MutationObserver` asserting zero removals of
> tagged nodes); walk shadow roots recursively; assert
> `hydrated === expected component count` from the server's own stats rather
> than `hydrated > 0`; and replace the `targetRoots <= 2` heuristic with a
> comparison against a known-good baseline.

**`hydration-parity.mjs` (8)** — the CI gate. Boots the real client over
server-rendered HTML and asserts the server markup paints with `main.js`
blocked, the shell fills the viewport, `mismatched === 0`, server DOM adopted
rather than replaced, no stray templates, no console errors.

Ship `globalThis.__rtglSsr = { hydrated, mismatched, reasons }` and gate CI on
`mismatched === 0`. Without it SSR silently stops paying for itself: you keep
shipping the bytes and lose the benefit, with no symptom.

---

## 7. Backend usage

The entire application integration:

```js
import { renderComponent, renderDocument } from "@rettangoli/fe/server";

// The build/prerender integration supplies the same component configs used by
// the browser bundle. Raw configs, resolved definitions, and
// { componentConfig, deps } registrations are accepted.
import { components } from "./server-components.js";
import { i18nRuntime } from "./server-i18n.js";

const handler = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { html, head } = renderComponent({
    component: "rvn-app",
    components,
    i18nRuntime,
    props: {
      route: url.pathname,
      query: Object.fromEntries(url.searchParams),
    },
  });

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(renderDocument({
    html,
    head,
    lang: i18nRuntime.current(),
    title: "Projects",
  }));
};
```

No jsdom, no DOM shim, no headless browser, no per-request global state — safe
to call concurrently. The prototype measured **~12 ms warm** (min 10.3, max 17.3 over 8
requests), 7.7 KB out.

There is no `env` or `isSsr` input. Route/query values belong in declared root
props, per §4.1. Platform/theme remain build-time or CSS concerns. Locale and
messages come from the existing i18n runtime contract. Whatever the server
passes as props/constants/i18n must also be present on the client's first
render.

The same `renderComponent` call serves build-time prerendering, so "static now,
server later" stays one code path. `renderComponent` surfaces contract,
cycle, depth, and serialization errors; the consumer boundary should catch
those and fall back to the plain `<rvn-app></rvn-app>` shell — degrading to
what ships today, never taking the page down.

---

## 8. Rollout

Each stage ships alone and is independently valuable.

### Part A — framework hygiene (done)

**Stage A1 — core/binding split (§5.0) — done.** `resolveComponentDefinition`
lives in `core/`; the guarded vendored snabbdom style module keeps imports
Node-safe; web-only construction lives behind the web binding.

Exit: `node -e "import('@rettangoli/fe')"` succeeds. That one result unblocks
every Node-side tool.

**Stage A2 — serializer + exports (§5.1, §5.6) — done.** The vnode→HTML
serializer, unit suite, `./server` entry, and HTML goldens are shipped. A
separate `./parser` export was intentionally unnecessary because `renderView`
owns the parser/helper dependencies.

Exit met: components render to HTML in bare Node and the project has five
readable `.html` goldens alongside its pixel references.

**Stop here if SSR is not wanted.** Nothing above is wasted, no consumer
changes, no ongoing maintenance commitment.

### Part B — SSR (B1 done; B2–B4 remain separate decisions)

**Stage B1 — recursive renderer (§5.2) — done.** Resolves tag → component, runs
the store, recurses, emits nested declarative shadow roots, supports
declarative opt-out, and guards cycles/depth. There are still no consumer
changes; the output is covered by HTML goldens.

**Stage B2 — hydration + ordering (§5.3–5.5).** Hydrating patch, topological
registration, `defer-hydration`, `__rtglSsr` telemetry, parity gate in CI. This
is where the ongoing maintenance commitment begins: mismatches degrade silently,
so the gate is not optional.

**Stage B3 — app adoption, shell only.** Prerender the app shell at build time.
Add the `rvn-app` CSS rule. Keep the UI bundle blocking. Low risk: the shell
depends on almost nothing.

**Stage B4 — full route depth.** Render the entire component tree for the
requested route, not just the shell. This is where the store cleanup lands
(§4.1): resolve `platform` at build time, and pass the route to
`mobileSidebar` as a prop instead of reading `window.location`.

Depth has now been measured (§9.1) and it does change the risk profile. All 14
routes render server-side, but hydration coverage drops on dense ones:
`/projects` (5 components) hydrates 5/5 with zero mismatches, while
`/project/variables` (9 components) hydrates 3/9. Stage 4 is achievable, but
the popover fix in §9.1 is a prerequisite for full coverage rather than an
optimisation.

Prerequisite for stages B3–B4: guard the prerender step on the web target only.
Tauri/Android/iOS share `_site`, and prerendered content in a desktop or mobile
shell may be wrong.

---

## 9. Limits and tradeoffs

**Time-to-interactive does not change — accepted, and out of scope.** The
bundle still parses and the boot sequence still runs, so users see a
correct-looking page that is not yet clickable. Improving TTI is deferred to
separate work (bundle size, boot sequencing); it is explicitly not what this
project delivers.

Mitigation while that remains true: prerender the **loading state**, not a
fake-ready state. It sets correct expectations and still moves FCP, because
only text is contentful — a shimmer or skeleton box moves it 0 ms.

**Data the server cannot see still arrives late.** Not fixable by rendering
work.

**Touch/viewport-dependent layout — decided: CSS.** `isTouchMode` currently
changes which elements exist (sidebar vs bottom tab bar, shell direction), not
just their styling. The resolution is to express those in CSS so both sides
emit identical markup and the browser decides layout.

Two consequences to plan for. Rendering both variants and hiding one means
hidden interactive elements must be kept out of the tab order —
`inert`/`display:none`, not `visibility:hidden`. And User-Agent sniffing, if
used as a secondary hint, is a heuristic: tablets and touch-capable laptops
will be guessed wrong, producing a hydration mismatch and a CSR fallback for
those visitors. That degrades correctly, but it is a real cost and should be
visible in the `mismatched` counter rather than assumed away.

### 9.1 Light-DOM restructuring blocks hydration — measured

The densest routes surfaced a problem class the shallow prototype did not.

`rtgl-popover` moves all of its children into a synthesized `rtgl-view`
wrapper on upgrade (`popover.js:407-427`). Because the UI bundle is a blocking
script, that happens at **parse time — before hydration runs**. The client's
vdom describes the template's children; the live DOM has already been
restructured. They cannot match.

Measured on `/project/variables` (9 components):

```
hydrated=3  mismatched=4
  <rtgl-popover> child count 4 != 3
  <rtgl-popover> child count 2 != 1
  <rvn-resizable-panel> child count 0 != 1     ← deps-seeded state (§4.1)
  <rtgl-view> child count 2 != 1               ← knock-on
```

Emitting the wrapper server-side **does not fix it** — tested. The numbers move
(`4 != 3` becomes `2 != 3`) but never converge, because the client's vdom
describes the *unwrapped* children and always will: the template has no
knowledge of the wrapper.

The real fix is in `@rettangoli/ui`: put the content wrapper in the popover's
**shadow** DOM, around the slot, rather than moving light-DOM children. Then
the template's children stay where the template put them and the zip succeeds.

Scope is bounded — `rtgl-popover` is the **only** structural offender among the
19 primitives. The others set attributes, which the hydrating patch re-applies
idempotently. But it appears in 13+ views, so components containing one fall
back to CSR until it is fixed: correct output, no SSR benefit for that subtree.

**The general rule this establishes:** a component that restructures its own
light DOM cannot be hydrated through. Either it adopts the structure the server
emitted, or it owns that structure in its shadow DOM.

A second finding from the same run: `rvn-whiteboard` cannot be imported in
Node at all (`src/internal/whiteboard/arrowUtils.js:1` imports an extensionless
`.ts` file that only Vite's resolver can find). That route degrades to an empty
mount point. It is a real app bug independent of SSR.

**Some components can never server-render.** Canvas, WebGL, Lexical. They opt
out declaratively and render as empty mount points — acceptable, since they sit
below the fold of first paint.

**Store cleanup is per-component work with no shortcut.** The cost is audit
breadth, not risk: every change also removes a wrong-then-corrected render from
the client.

---

## 10. Decisions

### 10.0 Still open

**`rtgl-popover`** (§5.7, §9.1). Fix it in `@rettangoli/ui`, or accept CSR
fallback on the 13+ views containing one. Blocks stage B4, not earlier.

The former Node-import and Part-A-sizing decisions are resolved. The guarded
vendored style module shipped, and both cold/HMR paths were kept behind the
shared core contracts.

### 10.1 Settled

Recorded so they are not relitigated.

**0. A shipped before B1; B2 remains a separate decision.** See §1.1. The
sequencing constraint was satisfied. Hydration is where silent mismatch risk
and the ongoing parity-gate commitment begin.

**1. Time-to-interactive is out of scope.** This project delivers a correct
first paint, not a faster boot. TTI work (bundle size, boot sequencing,
deferring heavy dependencies) is separate and may happen later. Anyone
describing this as a performance improvement is overselling it.

**2. Touch/viewport → CSS.** Layout that varies by pointer type or viewport is
expressed in CSS, not in the vdom, so both sides emit identical markup.
User-Agent sniffing is acceptable as a secondary hint, with the caveat in §9
that it will guess wrong for tablets and touch laptops and cost those visitors
a CSR fallback.

**3. Render the full route.** Not shell-only — the entire component tree for
the requested route. This puts the store cleanup in §4.1 in scope, and means a
dense route should be measured before stage 4 is called done (§8).

**4. Framework changes ship as version bumps.** A minor bump of
`@rettangoli/fe` republished through `rtgl`, rather than vendoring or patching
`node_modules`. Slower per iteration, but the alternative leaves consumers on a
copy that does not exist upstream.

**5. Local testing only for now.** No deploy target is required. Acceptance is
a local server plus the parity gate in §6. Note this makes now the cheapest
moment to change document structure — there is no production traffic to
regress, and that stops being true the day a public URL exists.

---

## Appendix — prototype

`RouteVN/routevn-creator-client/ssr-poc/`, with run instructions in its
`README.md`. It imports this package's `parser.js` and `store.js` directly, so
it exercises the real runtime rather than a copy.

Five variants were built and measured; the winner is `e_nested_dsd`
(per-component declarative shadow roots + hydrating patch + topological
registration). Variant `c_dsd` — declarative shadow DOM *without* hydration —
is retained deliberately as the cautionary case: it is visibly corrupt, with
the server and client trees stacked.

`node_modules` patches used to prove the framework changes are applied and
reverted by `ssr-poc/hydration/apply.js`; the tree is left clean.

**What the prototype actually ran.** It loads each component's `.handlers.js`
and calls `handleBeforeMount` against a hand-built stub service bag, and runs a
`syncFromProps` action by name convention. That is a **compatibility shim for
the validating app**, whose render-relevant state is seeded from injected
services — it is *not* the architecture §2.1/§4.2 propose, which never invokes
handlers server-side.

This was challenged in review as invalidating the headline number. It does not:
the run was independently repeated with `serverDeps: null`, no route seeding and
no sync actions, and still produced `hydrated=5 mismatched=0` — the server HTML
differed by one character. The shim affects *content* accuracy for that app, not
hydration parity. But the prototype should not be described as demonstrating the
handler-free design, because it does not.
