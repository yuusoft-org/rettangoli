# Development Guide

Canonical engineering contract for `packages/rettangoli-ui`.
`AGENTS.md` and this guide are intentionally merged here to keep one source of truth.

## Scope

`@rettangoli/ui` contains:
- primitives in `src/primitives/` (plain custom elements)
- FE-driven components in `src/components/` (built by `@rettangoli/fe`)
- visual test specs in `vt/`

## Primitive vs Component

### Primitive

A primitive is a low-level UI building block. It should be composable, predictable, and reusable across many contexts.

Primitive expectations:
- minimal API surface
- stable shared attrs and events
- no product-specific data contract
- mostly presentation and direct interaction behavior

### Component

A component is an opinionated composition for a complete workflow pattern and is built using `@rettangoli/fe`.

Component expectations:
- solves a real UI workflow end-to-end
- keeps the same naming/event conventions as primitives
- owns a richer data contract (`items`, `form`, `options`, and similar)
- remains interoperable with primitive layout and style attrs

## Library Design Goals

The interface should optimize for consistency more than local convenience.

Goals:
- one mental model for attrs, props, and events across all elements
- shared event semantics (`value-input` live, `value-change` commit)
- predictable responsive behavior (`sm-`, `md-`, `lg-`, `xl-`)
- token reuse instead of ad-hoc style variants
- primitives as stable atoms, components as workflow templates
- avoid duplicate components with overlapping responsibility

## Component Scope and Features

This is the intentional component surface and what each component is meant to provide.

| Component | Primary Role | Core Features |
| --- | --- | --- |
| `rtgl-accordion-item` | toggled content section | collapsible state, label/content/slot |
| `rtgl-breadcrumb` | hierarchical navigation path | item list, max collapse, separator icon, `item-click` |
| `rtgl-card` | content surface container | optional heading/description, size presets, slot body |
| `rtgl-dropdown-menu` | contextual menu overlay | positioned menu, item/label/separator rows, close + item events |
| `rtgl-form` | schema-driven form workflow | field schema, default values, action buttons, form/action/extra events |
| `rtgl-global-ui` | app-level interaction layer | alert/confirm/dropdown flows with promise-like API |
| `rtgl-navbar` | top app navigation shell | configurable start area, right slot, start click event |
| `rtgl-page-outline` | page section tracking | target and scroll containers, active section offset |
| `rtgl-popover-input` | inline edit with popover | value editing in popover, value input/change events |
| `rtgl-select` | single-choice selection | options, selected value, no-clear mode, add-option action |
| `rtgl-segmented-control` | inline single-choice selection | text or icon-only options, per-option hover tooltips, selected value, no-clear mode, add-option action |
| `rtgl-tag-select` | multi-tag selection | select-shaped options, selected value array, add popover, right-click delete |
| `rtgl-sidebar` | app/sidebar navigation | header plus grouped items, selected item state, item/header events |
| `rtgl-slider-input` | synchronized numeric control | linked slider + number input, min/max/step, value events |
| `rtgl-table` | tabular data display | column/row model, sortable headers, row click event |
| `rtgl-tabs` | segmented single selection | tab items, selected tab state, item click event |
| `rtgl-tooltip` | short contextual hint | controlled open/position/placement/content |
| `rtgl-waveform` | waveform media visualization | canvas rendering, loading state, width/height sizing |

When adding a new component, document:
- the unique workflow it serves
- why existing components cannot cover it
- its canonical event and payload contract

## Repo Structure

```
src/
├── primitives/     # Web components built from scratch
├── components/     # Components built with @rettangoli/fe
├── styles/         # Attribute -> CSS mappings
├── deps/           # Helpers (e.g. createGlobalUI)
├── entry-*.js      # iife entry points
└── setup.js        # setup for @rettangoli/fe
vt/                 # Visual testing (rettangoli-vt)
```

## Source of Truth

For FE component contracts, canonical docs are:
- `packages/rettangoli-fe/docs/overview.md`
- `packages/rettangoli-fe/docs/view.md`
- `packages/rettangoli-fe/docs/store.md`
- `packages/rettangoli-fe/docs/handlers.md`
- `packages/rettangoli-fe/docs/schema.md`
- `packages/rettangoli-fe/docs/methods.md`
- `packages/rettangoli-fe/docs/constants.md`

If this file conflicts with FE docs, FE docs win.

## Required FE Component Contract

For every component under `src/components/<name>/`:
- required: `*.view.yaml`
- required: `*.schema.yaml`
- optional: `*.handlers.js`, `*.store.js`, `*.methods.js`, `*.constants.yaml`

`*.view.yaml` is view-only:
- allowed: `template`, `refs`, `styles`
- forbidden: `elementName`, `viewDataSchema`, `propsSchema`, `events`, `methods`, `attrsSchema`

`*.schema.yaml` is API metadata:
- `componentName` required
- `propsSchema` is runtime source of props contract
- `events` and `methods` documented here

## Interface Consistency Rules

These rules are mandatory to prevent drift across primitives and components:

- attributes are kebab-case
- props are camelCase and attrs normalize to props
- prefer short attrs (<= 4 chars) unless in the exception list below
- short token values should reuse existing style maps (for example `bgc=bg`, `c=fg`, `bc=bo`)
- event names are kebab-case and consistent across similar components

If you need a new attr or token, update the relevant style map in `src/styles/` and document the contract change.

## API Hygiene Rules

These rules are also mandatory and apply to every primitive/component API change:

- every public attr must be documented, or explicitly marked internal-only
- do not keep dead observed attrs; if an attr is observed, it must affect runtime behavior
- behavior attrs that users may toggle at runtime must be reactive after mount (include them in observed attrs and update behavior on change)
- if a style/control attr supports responsive prefixes, dependent JS behavior must resolve breakpoints the same way
- event default policy is explicit: events should bubble by default unless the docs state a specific exception
- `key` must have one consistent semantic across primitives (documented reset contract), or be removed from primitive public API

## Runtime Semantics To Preserve

### Props and attributes

- components expose `props` only (no separate attrs API surface)
- both `name=value` and `:name=${expr}` feed `props` on component nodes
- attribute kebab-case normalizes to camelCase (`max-items` -> `maxItems`)
- `name=value` and `:name=${expr}` for the same prop on one node is invalid
- runtime read precedence is direct property value first, then attribute fallback

### Attribute values

- if JSON, value must be URI encoded
- boolean attribute parsing: only `true` means true; everything else is false
- prefer props for data and attrs for layout/styling

### Refs

- unprefixed ref key means ID match (`submitButton`)
- `#id` means explicit ID match, `.class` means class matching
- ID refs require camelCase IDs for matching
- reserved keys: `window`, `document`
- `deps.refs[key]` returns the element directly (not wrapper object)

### Events

- listener definition must include exactly one of `handler` or `action`
- action payload should be object; missing payload defaults to `{}`
- supported modifiers include `preventDefault`, `stopPropagation`, `stopImmediatePropagation`, `targetOnly`, `once`, `debounce`, `throttle`

## Attributes vs Props Examples

```html
<rtgl-select selected-value="123" no-clear></rtgl-select>
```

```js
select.selectedValue = "123";
select.noClear = true;
```

```html
<rtgl-popover-input auto-focus placeholder="Name"></rtgl-popover-input>
```

```js
popoverInput.autoFocus = true;
popoverInput.placeholder = "Name";
```

## Breakpoints

Responsive attr prefixes are `sm-`, `md-`, `lg-`, `xl-`.
Keep naming consistent between JS (observed attrs) and CSS media behavior.

## Long Attribute Whitelist

These are valid exceptions to the short-attr rule:

- `disabled`
- `value`
- `placeholder`
- `autofocus`
- `ellipsis`
- `target`
- `placement`
- `target-id`
- `scroll-container-id`
- `offset-top`
- `title`
- `content`
- `overflow`

## Form Input Types (rtgl-form)

Canonical `inputType` values are kebab-case only:

- `input-text`
- `input-date`
- `input-time`
- `input-datetime`
- `input-number`
- `input-textarea`
- `select`
- `tag-select`
- `color-picker`
- `slider`
- `slider-input`
- `image`
- `waveform`
- `popover-input`
- `read-only-text`
- `slot`

### Form field paths

- every data field name must be a non-empty string
- dotted field paths are supported for nested values (`user.email`)
- path traversal uses own properties only
- bracket notation is not supported
- `__proto__`, `constructor`, and `prototype` are reserved and rejected in any path segment
- legacy flat dotted defaults are normalized to nested values when written

## Events: Naming and Payloads

### Naming rules

- kebab-case only (for example `item-click`, `form-change`)
- use suffixes consistently: `*-click`, `*-change`, `*-input`, plus `open` and `close`
- value inputs emit `value-input` (live) and `value-change` (commit)
- avoid camelCase event names and inconsistent word order

### Payload rules

- always use `CustomEvent` with a `detail` object
- value changes include `detail.value`
- list/selection events include `detail.item` and `detail.index` when available
- form events include `detail.name` and `detail.formValues`
- events bubble by default; use `composed: true` only when crossing shadow boundaries is required

### Recommended payload shapes

```js
detail: { value }
detail: { value, label, index, item }
detail: { name, fieldValue, formValues }
detail: { actionId, formValues }
detail: {}
```

## Custom Elements (public surface)

Primitives exported via `src/index.js` and registered in `src/entry-iife-*.js`:
- `rtgl-carousel`, `rtgl-grid`, `rtgl-view`, `rtgl-text`, `rtgl-button`, `rtgl-image`, `rtgl-svg`
- `rtgl-input`, `rtgl-input-number`, `rtgl-textarea`
- `rtgl-slider`, `rtgl-color-picker`
- `rtgl-dialog`, `rtgl-popover`

### `rtgl-carousel`

- use for slotted horizontal slide navigation with built-in interaction behavior
- direct child elements are treated as slides and receive managed width + snap positioning
- public attrs:
  - `index` for the active slide index
  - `sw` for slide width (`1/1fb`, `4/5fb`, `320`, `80%`, and similar)
  - `sna` for slide snap alignment (`start`, `center`, `end`); `center` also adds edge padding so the first and last slides can rest centered
  - `snap` to enable or disable scroll snapping (`true` by default, set `snap="false"` for free scroll)
  - `g` for inter-slide gap
  - `spi` for `scroll-padding-inline`
  - `sbh` for scroll behavior
  - `nav` controls previous/next arrow visibility; arrows are shown by default, set `nav="false"` to hide them
  - boolean `pager` to show pager dots when you explicitly want them
- public methods:
  - `goTo(index)`
  - `next()`
  - `prev()`
- public property:
  - `snap` boolean for enabling or disabling scroll snap behavior
- emits `index-change` with `detail.index`
- pointer drag is built in for desktop mouse interaction; touch and trackpad continue to use native scrolling
- use a wrapper `rtgl-view` when you need surrounding padding, headings, or surface styling

### `rtgl-view`

- use for 1D layout, flex composition, scrolling surfaces, and generic containers
- `sh` enables horizontal overflow with `overflow-x: auto`
- `sv` enables vertical overflow with `overflow-y: auto`
- a single-axis flag clips the opposite axis; use both flags when both axes must scroll
- `sh` / `sv` keep the custom-element host as the actual native overflow scroller; do not move scrolling into an internal viewport or proxy `scrollTop`, `scrollLeft`, methods, dimensions, or events
- every scrolling surface uses the shared shadow-DOM overlay track/thumb automatically; there is no native-visible or opt-in scrollbar mode
- hide the complete browser-painted rail with `scrollbar-width: none` and the whole-scrollbar WebKit fallback; never style its individual native subparts
- use a 4px painted track/thumb inset 2px from the outer scrollport edge, with a 10px radius and 60% / 70% / 80% normal, hover, and active opacity; retain the larger edge-aligned transparent pointer target and never let these visuals affect layout
- the overlay layer must remain out of flex/grid flow, reserve zero gutter, contain no arrow controls, and leave host scroll/client dimensions unchanged
- the overlay layer must paint and receive pointer input above positioned/slotted user content at every authored `z-index`; isolate that priority inside the scrolling host so neighboring and browser top-layer UI remain above the scroll surface according to the host's own stacking order
- scrolling hosts establish a positioning context for the overlay when `pos` is otherwise unset; preserve explicit responsive `pos` values for the host's own positioning mode and document that absolutely positioned children resolve against the host
- tracks are thin, hidden at rest, shown on host mouse hover, and kept visible during pointer-captured thumb dragging
- there is no always-hidden or alternate scrollbar mode; every `sh` / `sv` surface uses the same hover-revealed overlay
- use the existing scrollbar tokens for all paint and thickness; never add fixture-specific component colors
- controller lifecycle must clean up scroll/load/resize/slot listeners, observers, animation frames, and pointer capture on disconnect
- create the overlay DOM and observers lazily only for hosts that declare `sh` / `sv` (including responsive variants); do not suppress browser paint for unrelated CSS-driven overflow
- raw CSS passthrough attrs with responsive variants include:
  - `ar` for `aspect-ratio`
  - `bgi`, `bgs`, `bgp`, `bgr` for background image styling
- prefer these attrs over ad-hoc inline style when the property is part of the shared primitive surface

### `rtgl-grid`

- use for explicit 2D column layouts
- `cols` and `sm-cols` / `md-cols` / `lg-cols` / `xl-cols` accept positive integers and render equal-width tracks
- shared spacing, sizing, border, background, visibility, overflow, and link attrs follow the same conventions as `rtgl-view`; `sh`, `sv`, and their responsive variants use the same overlay-scrollbar contract
- flex-only attrs such as `d`, `wrap`, `no-wrap`, `ah`, and `av` do not apply

Components built via `@rettangoli/fe`:
- `rtgl-select`, `rtgl-segmented-control`, `rtgl-tag-select`, `rtgl-dropdown-menu`, `rtgl-tooltip`, `rtgl-popover-input`
- `rtgl-form`, `rtgl-slider-input`, `rtgl-table`
- `rtgl-tabs`, `rtgl-sidebar`, `rtgl-navbar`, `rtgl-breadcrumb`
- `rtgl-accordion-item`, `rtgl-page-outline`, `rtgl-waveform`, `rtgl-global-ui`

If a component is not intended to be public, document that and avoid public examples.

## Migration Reality

The repo is mid-migration to mandatory `.schema.yaml`.
Legacy component view files may still contain old API keys. When touching a component, prefer migrating it fully in the same change.

## Editing Rules

- do not hand-edit generated output in `.rettangoli/`, `.temp/`, or `dist/` unless explicitly requested
- keep changes scoped; avoid unrelated formatting churn
- preserve existing component public behavior unless task explicitly changes behavior
- for new components, update `rettangoli.config.yaml` and `vt` specs when needed

## Local Dev Setup

Install:

```bash
npx i -g rtgl
bun install
```

Build:

```bash
bun run build
bun run build:dev
```

## Required Validation Commands

Run from `packages/rettangoli-ui/`:

```bash
bun run check:contracts
bun run build:dev
```

If UI behavior changed:

```bash
bun run vt:generate
bun run vt:report
```

Accept intended baselines:

```bash
bun run vt:accept
```

Temporary VT skips (as of 2026-02-11):
- `vt/specs/components/select/basic.html`
- `vt/specs/components/select/object-value.html`
- `vt/specs/components/select/overflow.html`
- `vt/specs/components/select/select-with-add-option.html`
- `vt/specs/components/select/select-placeholder.html`
- `vt/specs/components/select/select-selected.html`
- `vt/specs/components/sidebar/basic-1.html`
- `vt/specs/components/sidebar/basic-2.html`
- `vt/specs/components/sidebar/basic-3.html`
- `vt/specs/components/sidebar/basic-4.html`
- `vt/specs/components/sidebar/basic-5.html`
- `vt/specs/components/sidebar/basic-6.html`
- `vt/specs/components/sidebar/basic-7.html`
- These specs currently set `skipScreenshot: true` due intermittent CI rendering drift. Remove the skip once stabilized.
- `vt/specs/components/tooltip/basic.html` currently omits the final step screenshot due intermittent CI tooltip wrapping drift.

Serve VT output:

```bash
bun run serve
```

Then open `http://localhost:3000/view`.

For state-preserving component and VT development, run the UI watcher:

```bash
bun run watch
```

Open a candidate page on the watcher URL, for example
`http://localhost:3001/candidate/components/accordion-item/basic.html`.
Compatible edits to FE-driven components under `src/components/`, especially
their YAHTML (`.view.yaml`) files, update existing component instances without
replacing their stores or surrounding page state. The watcher also regenerates
edits under `vt/specs/` and `vt/templates/` and morphs the current generated
HTML in place. Custom-element/store identity, uncontrolled form values, focus,
selection, and page or nested scroll positions are retained. A generation
error keeps the last valid candidate and displays the error in the browser;
fixing the source applies the next valid update. Primitive modules under
`src/primitives/` and their transitive style/helper modules also update through
stable custom-element registrations. Existing primitive hosts, light DOM,
focus, form state, and scroll positions remain in place; `rtgl-view` and
`rtgl-grid` replace their stylesheet and overlay-scrollbar controller on the
same host without leaving an old controller or layer behind.

Primitive HMR deliberately reloads the document when a browser-captured
custom-element contract changes: observed attributes, base-element family,
form association, constructor-owned listeners/state, or shadow/state schema.
Compilation or update errors keep the last working implementation so a later
valid edit can recover. Production bundles continue to register the primitive
classes directly and do not include the development shell behavior.

## Theme / CSS

Load CSS in two steps:

1. `src/themes/base.css`
2. one theme file, e.g. `src/themes/theme-rtgl-slate.css` or `src/themes/theme-catppuccin.css`

Reference files for VT examples:

- `vt/static/public/base.css`
- `vt/static/public/theme-rtgl-slate.css`
- `vt/static/public/theme-rtgl-mono.css`
- `vt/static/public/theme-catppuccin.css`

## Suggested Change Flow

1. Read component files (`view`, `store`, `handlers`, optional `methods/constants`).
2. Add or migrate `schema` first.
3. Clean `view` to view-only keys.
4. Run `bun run check:contracts`.
5. Run `bun run build:dev`.
6. If UI changed, run VT and update baselines only when intended.

## Checklist (before PR)

- attrs are kebab-case and short unless whitelisted
- props are camelCase
- token values match existing style maps
- event names and payloads follow this contract
- docs updated when API behavior changes
- contracts/build/VT checks run as applicable
