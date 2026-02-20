# FE Contract Semantic Spec

This spec defines FE schema/contract semantics enforced by current checker rules:

- `packages/rettangoli-check/src/rules/feParity.js`
- `packages/rettangoli-check/src/rules/schema.js`
- `packages/rettangoli-check/src/rules/listenerConfig.js`
- `packages/rettangoli-check/src/rules/lifecycle.js`
- `packages/rettangoli-check/src/rules/expression.js`
- `packages/rettangoli-check/src/rules/compatibility.js`

## RTGL-SPEC-FE-001: Required files and forbidden in-view API metadata

1. Every component requires `.schema.yaml` (`RTGL-CONTRACT-001`).
2. `.view.yaml` forbids API metadata keys (`elementName`, `viewDataSchema`, `propsSchema`, `events`, `methods`, `attrsSchema`) with `RTGL-CONTRACT-002`.
3. Legacy `.prop=` style is rejected (`RTGL-CONTRACT-003`).

## RTGL-SPEC-FE-002: Schema component identity and shape

1. `componentName` must be trimmed and custom-element valid (`kebab-case`, at least one `-`).
2. Duplicate `componentName` values across schemas are invalid.
3. Component folder identity must be canonical (`lowercase-kebab` `category/component`) and FE contract file basenames must normalize to the component segment.
4. `attrsSchema` is unsupported in schema.
5. `methods` must be object-typed with `properties` object.
6. FE frontend builds a canonical internal schema shape:
- `componentName` is stored as a trimmed canonical key.
- `propsSchema.properties`, `propsSchema.required`, `events`, and `methods.properties` are normalized to deterministic canonical-key sets for symbol/scope/registry passes.

## RTGL-SPEC-FE-003: YAML parse failure contract

YAML parse failure in supported YAML files emits `RTGL-CHECK-PARSE-001` with parse reason and best line.

## RTGL-SPEC-FE-004: Constants contract

If `.constants.yaml` exists, root must be a YAML object (`RTGL-CHECK-CONSTANTS-001`).

## RTGL-SPEC-FE-005: Listener/ref event config semantics

1. `refs` keys are validated via FE contracts matcher.
2. `eventListeners` must be object-typed.
3. Listener options are strict allowlist (`handler`, `action`, `payload`, boolean flags, numeric flags).
4. Unknown options and invalid value types emit deterministic listener diagnostics.
5. FE runtime event-config validation is mirrored with deterministic mapped checker diagnostics.

## RTGL-SPEC-FE-006: Handler and lifecycle contracts

1. Handler symbols must be valid identifiers prefixed with `handle` (enforced during FE frontend model construction).
2. Lifecycle handlers enforce:
- `handleBeforeMount` must be synchronous.
- all lifecycle handlers use `deps` as first parameter.
- `handleOnUpdate` requires second `payload` parameter.
- `handleOnUpdate` requires second parameter name `payload` when using identifier parameter form.

## RTGL-SPEC-FE-007: Expression-to-schema compatibility

1. Expression roots must resolve against global symbols + local scope.
2. Resolved schema paths must exist for static path forms.
3. Boolean bindings require boolean-resolved schema types.
4. Jempl condition operators must use type-compatible operands for logical/comparison/arithmetic/equality semantics (`==` / `!=` require compatible operand types).
5. Condition-path schema segment errors are reported with path-specific diagnostics.

## RTGL-SPEC-FE-008: Inter-component compatibility

For custom-element usage against registry contracts:

1. required props must be provided
2. bound events must be supported
3. boolean binding kind must match target prop type
4. custom-element event bindings must use `handle*` handler symbols
5. bound custom-element handlers must exist in host `.handlers.js` exports
6. when target event schema declares required payload keys, handler signatures must accept compatible payload parameters

## RTGL-SPEC-FE-011: Listener payload-to-symbol contract

1. Ref listener payload object literals are validated against handler/action second-parameter object destructuring keys.
2. Missing payload keys emit deterministic contract diagnostics.

## RTGL-SPEC-FE-012: Method exposure and invocation compatibility

1. Exported methods must use object-compatible payload parameter forms.
2. Methods declaring multiple parameters are warned because runtime invokes methods with a single payload object.
3. If schema method payload contract defines required keys, exported method payload destructuring must cover those keys.

## RTGL-SPEC-FE-009: Ref key and element-id constraints

1. Invalid `refs` keys emit `RTGL-CHECK-REF-001`.
2. Invalid selector element IDs for ref matching emit `RTGL-CHECK-REF-002`.

## RTGL-SPEC-FE-010: JS/TS export extraction backend parity

1. Export extraction is AST-first via Oxc.
2. Core analysis paths (`analyzeProject`/model construction) do not route through regex-legacy extraction.
3. Oxc-vs-regex differential checks remain a separate non-core harness (`scripts/differential-js-exports.mjs`).
4. Local re-export resolution emits span-rich diagnostics (`RTGL-CHECK-SYMBOL-006/007`) with related locations.
5. Namespace re-export aliases (`export * as alias from "./module.js"`) are treated as named exports.
6. Exported destructuring declarations (`export const { a } = obj`, `export const [a] = arr`) contribute named exports for bound identifiers.
7. Exported TS-annotated variable declarations (`export const foo: T = v`, `export const { a }: T = v`, `export let foo!: T`) contribute named exports for bound identifiers.
8. Local namespace re-export targets must resolve; unresolved targets emit `RTGL-CHECK-SYMBOL-006` and do not satisfy FE symbol presence checks.
9. Local default-name re-exports (`export { default } from`, `export { x as default } from`) participate in target-resolution diagnostics and symbol sets deterministically.
10. TypeScript export assignments (`export = value`) are treated as default exports for symbol extraction and re-export alias resolution.
