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

6. `[P1]` End-to-end testing via `@rettangoli/vt` on examples
- **Motivation:** Unit and contract tests verify internal correctness but cannot catch real-browser regressions (rendering, event timing, lifecycle, interactions). We should not rely on users to report bugs that automated E2E can catch first.
- **Approach:** Use `@rettangoli/vt` (which already uses Playwright) to run visual + interaction tests against `examples/`. Write VT specs with steps (click, write, keypress, select, wait, screenshot) to exercise real component behavior, then assert screenshot output matches reference via pixelmatch.
- **No new framework needed** — leverage existing VT infrastructure instead of building a standalone Playwright E2E suite from scratch.
- **Test location:** VT specs live in each example's `vt/specs/` directory (e.g. `examples/example1/vt/specs/`).
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
  2. `rtgl vt generate` to capture candidate screenshots
  3. `rtgl vt report` to compare against reference — fails on mismatch
  4. `rtgl vt accept` to update baselines when changes are intentional
- **CI integration:** run `rtgl vt generate && rtgl vt report` on examples as part of PR checks

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
