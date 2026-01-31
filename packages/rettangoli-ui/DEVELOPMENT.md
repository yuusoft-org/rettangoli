# Development Guide

This document captures everything a developer should know to work in this package without introducing interface inconsistencies.

## Overview

Rettangoli UI is a Web Components library with:
- **Primitives**: low-level, dependency-free elements (`src/primitives/`).
- **Components**: higher-level components built with `@rettangoli/fe` (`src/components/`).
- **Attribute-first styling**: short attributes instead of class names.

## Repo Structure

```
src/
├── primitives/     # Web components built from scratch
├── components/     # Pre-built components using @rettangoli/fe
├── styles/         # Attribute → CSS mappings
├── deps/           # Helpers (e.g. createGlobalUI)
├── entry-*.js      # iife entry points
└── setup.js        # setup for @rettangoli/fe
vt/                 # Visual testing (rettangoli-vt)
```

## Interface Consistency Rules

These rules are mandatory to prevent drift across components:

- **Attributes are always kebab-case.**
- **Props are camelCase**, and HTML attributes are automatically converted to props.
- **Attribute names should be 4 characters or less** (exceptions must be rare and explicitly documented).
- **Short token values** should use existing style maps (e.g. `bgc=bg`, `c=fg`, `bc=bo`).
- **Event names should be kebab-case** and consistent across similar components.
- **Long attribute exceptions** are allowed for standard HTML/UX semantics (see whitelist below).

If you need a new attribute or token, update the relevant style map in `src/styles/` and document it here.

## Attributes vs Props

- Every component should support **props first**, then fallback to **attributes**.
- Attribute values:
  - If JSON, must be **URI encoded**.
  - Boolean attributes: `true` means true; everything else false.
- Prefer **props for data** and **attrs for layout/styling**.

### Examples (kebab-case attrs → camelCase props)

```html
<!-- Attribute form -->
<rtgl-select selected-value="123" no-clear></rtgl-select>
```

```js
// Equivalent props form
select.selectedValue = "123";
select.noClear = true;
```

```html
<!-- Attribute form -->
<rtgl-popover-input auto-focus placeholder="Name"></rtgl-popover-input>
```

```js
// Equivalent props form
popoverInput.autoFocus = true;
popoverInput.placeholder = "Name";
```

## Breakpoints

Responsive attribute prefixes are: `sm-`, `md-`, `lg-`, `xl-`.
Keep naming consistent between JS (observed attributes) and CSS (media queries).

## Long Attribute Whitelist (exceptions to <= 4 chars)

These are allowed because they map to standard HTML semantics or widely understood UX terms.

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

Canonical `inputType` values are **kebab-case only**:

- `input-text`
- `input-number`
- `input-textarea`
- `select`
- `color-picker`
- `slider`
- `slider-input`
- `image`
- `waveform`
- `popover-input`
- `read-only-text`
- `slot`

## Events: Naming and Payloads

### Naming rules
- **kebab-case only** (e.g. `item-click`, `form-change`).
- **Use action suffixes** consistently: `*-click`, `*-change`, `*-input`, `open`, `close`.
- **Value inputs emit `value-input` (live) and `value-change` (commit)**.
- Avoid camelCase event names and avoid swapping word order (`click-item` vs `item-click`).

### Payload rules (best practices)
- Always use `CustomEvent` with a **`detail` object** (never primitives).
- For value changes, **always include `detail.value`**.
- For list/selection events, include **`detail.item`** and **`detail.index`** when available.
- For form events, include **`detail.name`** and **`detail.formValues`**.
- Events should **bubble by default**; use `composed: true` when crossing shadow boundaries is required.

### Recommended payload shapes
Value change:
```js
detail: { value }
```

Selection / list item:
```js
detail: { value, label, index, item }
```

Form change:
```js
detail: { name, fieldValue, formValues }
```

Action click:
```js
detail: { actionId, formValues }
```

Close:
```js
detail: {}
```

## Custom Elements (public surface)

Primitives exported via `src/index.js` and registered in `src/entry-iife-*.js`:
- `rtgl-view`, `rtgl-text`, `rtgl-button`, `rtgl-image`, `rtgl-svg`
- `rtgl-input`, `rtgl-input-number`, `rtgl-textarea`
- `rtgl-slider`, `rtgl-color-picker`
- `rtgl-dialog`, `rtgl-popover`

Components (built via `@rettangoli/fe`):
- `rtgl-select`, `rtgl-dropdown-menu`, `rtgl-tooltip`, `rtgl-popover-input`
- `rtgl-form`, `rtgl-slider-input`, `rtgl-table`
- `rtgl-tabs`, `rtgl-sidebar`, `rtgl-navbar`, `rtgl-breadcrumb`
- `rtgl-accordion-item`, `rtgl-page-outline`, `rtgl-waveform`, `rtgl-global-ui`

If a component is not intended to be public, document it and avoid adding examples in README.

## Local Dev Setup

### Install CLI + deps
```bash
npx i -g rtgl
bun install
```

### Build
```bash
bun run build
```

### Build (dev)
```bash
bun run build:dev
```

## Visual Testing (rettangoli-vt)

Generate screens:
```bash
bun run vt:generate
```

Report diffs:
```bash
bun run vt:report
```

Accept new baselines:
```bash
bun run vt:accept
```

Serve generated screens:
```bash
bun run serve
```

Then open `http://localhost:3000/view`.

## Theme / CSS

You must include a theme stylesheet for variables (colors, spacing, typography). Use:
- Reference: `src/vt/static/public/theme.css`

## Adding or Changing a Component

1. Define interface in `*.view.yaml` (attrsSchema + propsSchema + events).
2. Implement behavior in `*.handlers.js` and `*.store.js`.
3. Ensure attributes follow the consistency rules.
4. Emit events with consistent naming and payloads (see Events section).
5. Add or update visual tests in `vt/` if UI changes.

## Checklist (before PR)

- Attributes are kebab-case and <= 4 chars.
- Props are camelCase.
- Token values match existing style maps.
- Event names are kebab-case and consistent.
- Documentation updated (README + this file if needed).
- Visual tests updated or verified.
