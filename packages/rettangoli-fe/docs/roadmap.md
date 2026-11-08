# Rettangoli FE Roadmap

This roadmap is the planning source for `packages/rettangoli-fe`.

## Priority Tags

- `[P0]` Critical: contract correctness, breaking bugs, release blockers
- `[P1]` Important: architecture, maintainability, high-impact DX
- `[P2]` Backlog: useful improvements, lower urgency

## Priorities

1. `[P0][DONE]` Complete schema-first contract rollout in FE tooling
- Keep `schema.componentName` and `schema.propsSchema` as the only runtime source.
- Ensure all FE entry points (`build`, `watch`, scaffold flow) enforce the same contract behavior.
- Keep `.view.yaml` API keys ignored/blocked consistently.

2. `[P0][DONE]` Strengthen contract tests around the new interface
- Expand Puty coverage for file-contract validation and error cases.
- Keep runtime tests for props precedence, refs behavior, and event payload semantics.
- Ensure error messages remain stable string contracts.

3. `[P1][DONE]` Split platform-agnostic core from web-specific runtime
- Move pure view/store/lifecycle contracts into environment-neutral modules.
- Isolate browser and Custom Element side effects behind adapters.
- Target easier reuse for non-web runtimes.
- Progress:
- extracted reusable component runtime helpers into `core/runtime/componentRuntime.js`
- extracted web DOM bootstrap into `web/componentDom.js` with runtime tests
- routed frame scheduling through `web/scheduler.js` and removed direct `requestAnimationFrame` usage from core runtime paths
- moved parser web-component update hook into `web/componentUpdateHook.js` and inject hook factories into parser core
- moved Custom Element class runtime from `createComponent.js` into `web/createWebComponentClass.js` so `createComponent` is now a thin schema/contract orchestrator

4. `[P1][DONE]` Improve CLI validation output
- Add grouped/summarized errors (by component and rule).
- Add optional machine-readable output mode for CI tools.

5. `[P1][DONE]` Keep docs as the single source spec
- Continue aligning `overview.md`, `view.md`, `store.md`, `handlers.md`, `schema.md`, `methods.md`, `constants.md`.
- Add concise invalid/valid examples when contracts evolve.

6. `[P1][DONE]` End-to-end testing via `@rettangoli/vt` on FE fixtures
- **Motivation:** Unit and contract tests verify internal correctness but cannot catch real-browser regressions (rendering, event timing, lifecycle, interactions). We should not rely on users to report bugs that automated E2E can catch first.
- **Approach:** Use `@rettangoli/vt` (which already uses Playwright) to run visual + interaction tests against `examples/`. Write VT specs with steps (click, write, keypress, select, wait, screenshot) to exercise real component behavior, then assert screenshot output matches reference via pixelmatch.
- **No new framework needed** — leverage existing VT infrastructure instead of building a standalone Playwright E2E suite from scratch.
- **Test location:** VT specs live under each FE E2E fixture's `vt/specs/`
  directory (for example, `e2e/interactions/vt/specs/`).
- **Scenarios to cover via VT specs:**
  - Component renders correctly in real browser (initial state screenshot)
  - Props/attributes produce expected visual output (multiple viewData variants in `.examples.yaml`)
  - User interactions: click handlers, text input, keyboard events (via VT steps)
  - Store state changes reflected in DOM after interaction (screenshot after step sequence)
  - Control flow rendering ($if/$for) with different data states
  - Multi-component pages (parent-child prop flow, event propagation)
  - Edge cases: empty state, error state, boundary values
- **Workflow:**
  1. `rtgl fe build` in the example project
  2. `rtgl vt screenshot` to capture candidate screenshots
  3. `rtgl vt report` to compare against reference — fails on mismatch
  4. `rtgl vt accept` to update baselines when changes are intentional
- **CI integration:** run `rtgl vt screenshot && rtgl vt report` on the FE E2E
  fixtures as part of PR checks
- **Completed coverage:**
  - 8 VT interaction specs across the `dashboard` and `interactions` FE
    examples
  - click, write, keyboard, wait, state-transition, control-flow, i18n, and
    composed parent/child scenarios with screenshot assertions
  - a `ci-ui.yaml` matrix that builds both examples, captures and reports via
    the pinned VT browser image, and uploads failure artifacts

7. `[P1][DONE]` Prerendering and hydration (`prerender.md`)
- Build time: recursive renderer, `loadComponents` for build tools, and
  serialized root props (`renderComponent({ serializeProps: true })`).
- Browser: the first render of a `data-rtgl-hydrate` host adopts the
  prerendered nodes, replaces subtrees whose structure differs, and clears a
  render target left half built by a failed first patch.
- Parents-first registration when a document holds prerendered markup.
- `globalThis.__rtglHydration` counts hydrated and mismatched hosts; browser
  check in `test/web/hydration.browser.mjs`.

## Backlog

1. `[P2]` Performance and scalability checks
- Add benchmarks for parse/render and listener setup on large templates.
- Track regressions with simple baseline metrics.

2. `[P2]` Extended contract checks
- Optional warnings for risky patterns (very broad wildcards, oversized payload templates).
- Optional strict mode flags for CI hardening.

3. `[P2]` Developer ergonomics
- Improve scaffold defaults for schema-first components.
- Add short troubleshooting docs for common contract failures.

4. `[P2]` First-render hazard checks
- Flag browser globals, the clock and `Math.random` in `createInitialState`
  and `selectViewData` (`prerender.md`, the first render contract), so
  hydration mismatches fail a check instead of being silently corrected.

5. `[P2]` Hydrate through `rtgl-popover`
- It moves its children into a wrapper on upgrade, so a subtree holding one is
  re-rendered instead of adopted (`prerender.md`, design notes).

## Deferred Decisions

Maintainer decisions that change behavior users could notice, so they are not
done yet.

### Runtime

1. `[P1]` Stable keys for elements that follow `$if` or `$for` siblings
- Key non-id elements by static template position so a sibling that
  grows or shrinks stops recreating or shuffling the elements after it.
- Today a changed sibling count recreates those elements, and they lose focus,
  scroll and state.

2. `[P1]` One update pipeline
- Parent-to-child updates in one frame through a shared frame queue,
  instead of one frame per nesting level.
- One `handleOnUpdate` contract. The direct path passes
  `changedProp`, the parent path does not (`handlers.md`).
- Keep a queued update when a keyed move reconnects the child before
  the frame. `handlers.md` documents the current discard; change it together
  with the test in `test/runtime/parent-component.integration.test.js`.
- Stop setting the `isDirty` attribute on every child update.

3. `[P1]` Toggle and expression semantics
- `?attr=${expr}` for values that are not booleans.
- Report unsupported `${}` expressions such as `${!x}` and `${a == b}`,
  which silently render nothing.
- Omit attributes whose interpolation is undefined or null.
- Reject prop names that collide with element internals.
- Report bare `.x` binding tokens, which are dropped silently.

4. `[P2]` Store freeze and HMR scope
- Freeze the initial store state, as the first action already does.
- Measure how often HMR applies in place, then simplify it.

5. `[P2]` View IR rewrite
- Compile templates once into binding descriptors so a render stops
  round-tripping through strings. Performance only; start after items 1
  and 3 above settle key and toggle semantics.

6. `[P2]` Public testing entry
- `@rettangoli/fe/testing` exporting `parseView`, `parseTemplate`,
  `renderView` and `createComponent`, so tests stop deep-importing fe and the
  nested jempl. Every existing deep path keeps working.

7. `[P2]` Hydration and class edge cases
- A static attribute that only one `$if` branch writes on a custom element
  stays after hydration when the branches swap, because only `?` toggles are
  tracked.
- A `?class` toggle that is off on both sides removes classes the element
  added to itself while hydrating; skip `class` as the plain-element path does.
- A prop setter that writes its own attribute (`snap`, `index`) ends with no
  attribute after a server-on, client-off hydration.
- A class that the selector drops in an update is removed even when the new
  `class=` value still lists it (`div#box.card class=""` then
  `div#box class="card"`).

### Build And Dev Server

1. `[P1]` Stricter build checks
- A duplicate component id becomes an error (a warning today).
- A schema problem from `RTGL-CONTRACT-004` to `-006` fails
  `rtgl fe build` (a warning today).

2. `[P1]` Dev server
- `rtgl fe watch` imports the project's `@rettangoli/fe`, as the build
  does.
- `host` and `allowedHosts` options; the server binds `0.0.0.0` with
  every host allowed today.
- Watch error handling: recover from a broken entry instead of
  returning 500 pages or exiting on a startup failure.
- An explicit watch root instead of the `static` path rule
  (`README.md`, Vite Integration).

3. `[P2]` Smaller build items
- Prerender errors name the failing component and its path.
- Deprecate `rtgl fe examples`, which emits invalid HTML.
- Warn about flat component layouts, which get no setup deps.
- Deprecate `renderDocument` and `renderComponent().head`.
- Make `vite` an optional peer dependency.
- Sort component files independently of the build machine's locale.
- Report unknown view keys, unknown listener options and refs that
  match no element (in `@rettangoli/check`).
- Dotted i18n keys. The cross-locale check splits `namespace.key` at
  every `.`, so a catalog whose namespace or key name contains one fails the
  build; the error text now says so.
- Export `isValidCustomElementName` and
  `validateComponentSchemaContracts` through `@rettangoli/fe/contracts`, together
  with the same decision in `@rettangoli/check`.
