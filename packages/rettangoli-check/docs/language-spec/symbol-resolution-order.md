# Canonical Symbol Resolution Order

This document defines deterministic resolution order across YAHTML/Jempl/FE:

- `packages/rettangoli-check/src/core/model.js`
- `packages/rettangoli-check/src/core/scopeGraph.js`
- `packages/rettangoli-check/src/core/semantic.js`
- `packages/rettangoli-check/src/rules/crossFileSymbols.js`
- `packages/rettangoli-check/src/rules/expression.js`

## RTGL-SPEC-SYMBOL-001: Canonical source sets

Global symbol set is built from:

1. built-ins (`_event`, `_action`, `props`, `state`, `refs`, browser/JS globals)
2. schema `propsSchema.properties` names and case aliases
3. constants root keys
4. named exports from `.handlers.js`, `.methods.js`, `.store.js`
5. `selectViewData` return-object keys from store module exports

Local symbol set is built from Jempl control-flow scopes (`for` loop vars).

## RTGL-SPEC-SYMBOL-002: Resolution precedence

Expression root resolution order:

1. local symbols (nearest scope)
2. global symbol set
3. numeric literal exemption
4. otherwise unresolved (`RTGL-CHECK-EXPR-001`)

## RTGL-SPEC-SYMBOL-003: Cross-file export-chain semantics

1. Export discovery includes direct named exports (including destructured and TS-annotated `export const/let/var` declarations), TS export assignments (`export = value`) as default exports, `export *`, namespace re-export aliases (`export * as ns`), and named re-exports (including default-name forms like `export { default } from ...` and `export { x as default } from ...`).
2. Resolution follows local relative module specifiers with JS/TS extension fallback.
3. Local namespace re-export aliases are only retained when the target module resolves.
4. Re-export traversal is cycle-safe.
5. Type-only re-exports are ignored for runtime symbol contracts.

## RTGL-SPEC-SYMBOL-004: Symbol contract diagnostics

1. Missing listener handler/action exports emit `RTGL-CHECK-SYMBOL-001/002`.
2. Missing schema-declared method exports emit `RTGL-CHECK-SYMBOL-003`.
3. Unsupported default method export emits `RTGL-CHECK-SYMBOL-004`.
4. Undocumented exported methods emit warn-level `RTGL-CHECK-SYMBOL-005`.
5. Invalid exported handler names emit `RTGL-CHECK-HANDLER-002`.
6. Unresolved local re-export module targets (including namespace/default-name re-exports) emit `RTGL-CHECK-SYMBOL-006`.
7. Re-exported symbols missing in resolved target modules emit `RTGL-CHECK-SYMBOL-007`.
8. Import/export resolution diagnostics include related spans (declaration span + resolved target anchor).
