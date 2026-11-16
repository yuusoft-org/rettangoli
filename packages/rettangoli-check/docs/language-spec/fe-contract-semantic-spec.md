# FE Contract Semantic Spec

This spec defines FE schema/contract semantics enforced by current checker rules:

- `packages/rettangoli-check/src/rules/feParity.js`
- `packages/rettangoli-check/src/rules/schema.js`
- `packages/rettangoli-check/src/rules/listenerConfig.js`
- `packages/rettangoli-check/src/core/model.js` (lifecycle handlers)
- `packages/rettangoli-check/src/rules/expression.js`
- `packages/rettangoli-check/src/rules/compatibility.js`

## RTGL-SPEC-FE-001: Required files and forbidden in-view API metadata

1. Every component requires `.schema.yaml` (`RTGL-CONTRACT-001`).
2. `.view.yaml` forbids API metadata keys (`elementName`, `viewDataSchema`, `propsSchema`, `events`, `methods`, `attrsSchema`) with `RTGL-CONTRACT-002`.
3. Unsupported property binding source syntax is rejected (`RTGL-CONTRACT-003`), including legacy `.prop=` and non-interpolated `:prop=value` forms.

## RTGL-SPEC-FE-002: Schema component identity and shape

1. `componentName` must be trimmed and custom-element valid (`kebab-case`, at least one `-`).
2. Duplicate `componentName` values across schemas are invalid.
3. FE contract file basenames must normalize to the component segment. Canonical (`lowercase-kebab` `category/component`) folder naming is optional style lint (`--style`); runtime-supported camelCase folders pass default validation.
4. `attrsSchema` is unsupported in schema.
5. `methods` must be object-typed with `properties` object.
5a. `ssr`, when present, must be a boolean (`RTGL-CHECK-SCHEMA-009`), as FE requires at registration.
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

1. Referenced handler symbols must resolve to exports. Valid identifiers are supported regardless of prefix.
2. `handleBeforeMount` must be synchronous.
3. `--style` additionally enforces `handle`-prefixed handler exports and references, `deps` as lifecycle first parameter, and a second `payload` parameter for `handleOnUpdate`. These naming and signature conventions do not constrain runtime behavior; destructuring, renamed arguments, and unused omitted arguments pass default validation.

## RTGL-SPEC-FE-007: Expression-to-schema compatibility

1. Expression roots must resolve against global symbols + local scope.
2. Resolved schema paths must exist for static path forms.
3. Boolean bindings require boolean-resolved schema types.
4. Jempl condition operators must use type-compatible operands for logical/comparison/arithmetic/equality semantics (`==` / `!=` require compatible operand types).
5. Condition-path schema segment errors are reported with path-specific diagnostics.

## RTGL-SPEC-FE-008: Inter-component compatibility

For custom-element usage against registry contracts:

1. required props must be provided
2. boolean binding kind must match target prop type
3. prop binding values must be compatible with the target prop type

Template keys cannot bind events: FE rejects `@event=handler` and a bare `@event`, so they are reported as `RTGL-CHECK-BINDING-001` on every element. Listeners are declared under `refs.<id>.eventListeners` and validated by the listener rules.

## RTGL-SPEC-FE-011: Listener payload shape

1. A ref listener `payload` must be a YAML mapping; FE ignores any other payload value.
2. A truthy non-mapping payload (string, number, `true`, list) emits `RTGL-CHECK-LISTENER-010`. A falsy payload (`null`, `false`, `0`, `""`) means no payload and is not reported.

## RTGL-SPEC-FE-012: Method exposure and invocation compatibility

1. Exported methods must use object-compatible payload parameter forms.
2. Methods declaring multiple parameters are warned because runtime invokes methods with a single payload object.
3. If schema method payload contract defines required keys, exported method payload destructuring must cover those keys.

## RTGL-SPEC-FE-013: Module-scope state and store purity

1. A component module is evaluated once, so its module-scope bindings are shared by every instance. In `.handlers.js`, `.store.js` and `.methods.js`, a top-level `let` or `var`, and a top-level `const` that the same file mutates (a write, `++`/`--` or `delete` on a member chain rooted at it, or a `set`/`add`/`delete`/`clear`/`push`/`pop`/`shift`/`unshift`/`splice`/`sort`/`reverse`/`fill`/`copyWithin` call on it), emit `RTGL-CHECK-MODULE-001` at the binding. Never-mutated constants, functions, classes, imports, shadowing locals or parameters, and constants initialised with `new WeakMap()` or `new WeakSet()` are not reported.
2. A `.store.js` has no side effects. A reference to an identifier that the file neither declares nor imports and that is not a pure built-in, and a call of `Math.random()`, `Date.now()`, `Date()` or `new Date()` without arguments, emit `RTGL-CHECK-STORE-001`, once per name or call form per file, at the first use.
3. Files that do not parse are skipped (`RTGL-CHECK-PARSE-002` reports them).

## RTGL-SPEC-FE-009: Ref key and element-id constraints

1. Invalid `refs` keys emit `RTGL-CHECK-REF-001`.
2. Element IDs are not reported. FE renders any id. An id that an id ref cannot name (kebab-case, a leading digit or capital, an underscore) is just not matched by id refs, and `id=` wins over `#id`. `RTGL-CHECK-REF-002` is retired.

## RTGL-SPEC-FE-010: JS/TS export extraction backend parity

1. Export extraction is AST-first via Oxc.
2. There is no regex fallback extractor.
3. Local re-export resolution emits span-rich diagnostics (`RTGL-CHECK-SYMBOL-006/007`) with related locations.
4. Namespace re-export aliases (`export * as alias from "./module.js"`) are treated as named exports.
5. Exported destructuring declarations (`export const { a } = obj`, `export const [a] = arr`) contribute named exports for bound identifiers.
6. Exported TS-annotated variable declarations (`export const foo: T = v`, `export const { a }: T = v`, `export let foo!: T`) contribute named exports for bound identifiers.
7. Local namespace re-export targets must resolve; unresolved targets emit `RTGL-CHECK-SYMBOL-006` and do not satisfy FE symbol presence checks.
8. Local default-name re-exports (`export { default } from`, `export { x as default } from`) participate in target-resolution diagnostics and symbol sets deterministically.
9. TypeScript export assignments (`export = value`) are treated as default exports for symbol extraction and re-export alias resolution.
10. A module that does not parse emits `RTGL-CHECK-PARSE-002` at its first syntax error (once per file and position across the project). Its export set, and the export set of every module that re-exports from it (`export *` or a named re-export), is unknown: symbol presence checks (`RTGL-CHECK-SYMBOL-001/002/003/007`, `RTGL-CHECK-SEM-004`) are skipped for it.
