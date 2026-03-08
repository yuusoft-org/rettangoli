# Bundle Size Roadmap

This document captures the current bundle-size findings for `@rettangoli/ui`, the first cleanup pass implemented now, and the next phases to ship after this change lands.

## Current Findings

- The current browser bundle strategy is monolithic.
  - [`src/entry-iife-ui.js`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-ui/src/entry-iife-ui.js) eagerly registers every primitive and then imports the generated FE entry.
  - [`../rettangoli-fe/src/cli/frontendEntrySource.js`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-fe/src/cli/frontendEntrySource.js) generates one FE entry that eagerly defines every FE component.
  - [`esbuild.js`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-ui/esbuild.js) only emits monolithic IIFE outputs.

- The current repo usage does not justify shipping the full FE component bundle on every page.
  - Site templates such as [`../rettangoli-sitekit/sitekit/templates/base.yaml`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-sitekit/sitekit/templates/base.yaml) mostly use primitives.
  - Docs templates such as [`../rettangoli-sitekit/sitekit/templates/docs.yaml`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-sitekit/sitekit/templates/docs.yaml) need primitives plus a small set of FE-driven widgets such as `rtgl-page-outline`.

- The FE runtime currently pulls in more code than it should on the hot path.
  - [`../rettangoli-fe/src/parser.js`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-fe/src/parser.js) only needs `flattenArrays`, but it imported that helper from [`../rettangoli-fe/src/common.js`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-fe/src/common.js), which previously also imported `rxjs`.

- `jempl` was duplicated across package boundaries.
  - [`package.json`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-ui/package.json) used `jempl@1.0.0`.
  - [`../rettangoli-fe/package.json`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-fe/package.json) used `jempl@0.3.2-rc2`.

- `@rettangoli/ui` carried direct dependencies that are not used in its source tree.
  - `@floating-ui/dom`
  - `commander`
  - `js-yaml`
  - `liquidjs`
  - direct `snabbdom`

## First Cleanup Pass

This change set implements the smallest safe improvements before changing the output model:

1. Isolate FE runtime helpers from unrelated helpers.
   - Move `flattenArrays` into a dedicated utility file.
   - Update FE runtime imports to use the isolated utility directly.
   - Keep `common.js` free to retain non-runtime helpers without forcing them into the runtime path.

2. Dedupe `jempl` across `@rettangoli/ui` and `@rettangoli/fe`.
   - Align the FE package to the same `jempl` version used by `@rettangoli/ui`.

3. Audit hot-path runtime dependencies.
   - `rxjs`: removed from `@rettangoli/fe` after confirming the only remaining usage was the dead `CustomSubject` export in `common.js`.
   - `immer`: still required on the FE hot path because store action execution in [`../rettangoli-fe/src/core/runtime/store.js`](/Users/hanyonwu/Code/yuusoft-org/rettangoli.acess/packages/rettangoli-fe/src/core/runtime/store.js) currently depends on `produce()`.

4. Remove unused direct dependencies from `@rettangoli/ui`.
   - Keep `@rettangoli/fe` and `jempl`.
   - Remove obviously unused direct dependencies from the UI package manifest.

## Recommended Target Architecture

The best medium-term shape is a hybrid of patterns used by Stencil, Shoelace, Lit, and Material Web:

- `core-primitives`
  - eager
  - layout and common input primitives only

- `fe-runtime`
  - shared once
  - FE runtime only, with no unrelated helper imports

- usage packs
  - `docs`
  - `forms`
  - `overlays`
  - `media`
  - optional `navigation`

- `full`
  - compatibility bundle only

- ESM entrypoints for bundlers
  - per primitive and per component exports
  - shared FE runtime deduped by the app bundler

- browser autoloader or page-level pack loading for CDN users
  - use packs, not per-component requests, for pages that need FE widgets

## Proposed Pack Boundaries

Recommended first split:

- `core-primitives`
  - `rtgl-view`
  - `rtgl-grid`
  - `rtgl-text`
  - `rtgl-button`
  - `rtgl-image`
  - `rtgl-tag`
  - `rtgl-svg`
  - `rtgl-input`
  - `rtgl-input-date`
  - `rtgl-input-time`
  - `rtgl-input-datetime`
  - `rtgl-input-number`
  - `rtgl-textarea`
  - `rtgl-checkbox`
  - `rtgl-slider`
  - `rtgl-color-picker`
  - `rtgl-dialog`
  - `rtgl-popover`

- `docs`
  - `rtgl-page-outline`
  - `rtgl-sidebar` if docs pages need FE behavior there

- `forms`
  - `rtgl-form`
  - `rtgl-select`
  - `rtgl-popover-input`
  - `rtgl-slider-input`

- `overlays`
  - `rtgl-tooltip`
  - `rtgl-dropdown-menu`
  - `rtgl-global-ui`

- `media`
  - `rtgl-waveform`

- `navigation`
  - `rtgl-tabs`
  - `rtgl-breadcrumb`
  - `rtgl-accordion-item`
  - `rtgl-navbar`

## Execution Plan

### Phase 0

- isolate runtime helpers
- dedupe `jempl`
- trim unused direct dependencies
- document current findings and target architecture

### Phase 1

- add a dedicated FE runtime entry
- generate FE pack entries instead of one all-components entry
- keep the full bundle for backward compatibility

### Phase 2

- move CDN/browser consumers to `core-primitives` plus page-level packs
- update sitekit templates to stop loading the full UI bundle on primitive-only pages

### Phase 3

- add ESM multi-entry outputs with shared chunks
- add optional browser autoloader for CDN users
- publish a size table for each bundle and pack

## Acceptance Criteria For The Next Phase

- primitive-only pages stop paying for FE components
- FE runtime is shared once instead of bundled into every pack
- no critical first-paint layout depends on lazy-defined components
- docs and app pages load only the packs they actually need
