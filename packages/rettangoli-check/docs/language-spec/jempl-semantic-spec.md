# Jempl Semantic Spec

This spec defines Jempl parse and scope behavior used by semantic analysis:

- `packages/rettangoli-check/src/rules/jempl.js`
- `packages/rettangoli-check/src/core/scopeGraph.js`

## RTGL-SPEC-JEMPL-001: Template parse validity

1. If `.view.yaml` contains `template`, it must parse via `jempl.parse`.
2. Parse failure emits `RTGL-CHECK-JEMPL-001` at the `template` key line.
3. Parse messages are normalized to stable single-line diagnostics.

## RTGL-SPEC-JEMPL-002: Listener payload parse validity

1. If a listener event config contains `payload`, payload must parse via `jempl.parse`.
2. Parse failure emits `RTGL-CHECK-JEMPL-002` on payload-preferred location.

## RTGL-SPEC-JEMPL-003: Control-flow and scope semantics

1. Loop nodes introduce local scope for `itemVar` and `indexVar`.
2. Conditional branches preserve outer scope and evaluate each condition/body subtree.
3. Element-level local symbols are associated by raw-key occurrence order and line.
4. Local symbols are available for expression root resolution before unresolved-root diagnostics.
5. Nested local symbols shadow outer symbols of the same name for schema/type resolution.

## RTGL-SPEC-JEMPL-004: Expression root extraction

1. Root identifiers are extracted with string-literal masking and reserved-word exclusion.
2. Path expressions from Jempl nodes and YAHTML attribute expressions feed one reference stream.
3. References preserve context (`template-value`, `loop-iterable`, `attr-*`, `listener-payload`) and full range metadata (`line`, `column`, `endLine`, `endColumn`, `offset`, `endOffset`, `length`).
4. YAHTML attribute expression references use per-expression spans (not whole-attribute fallback) when expression nodes are available.
5. Conditional expressions preserve typed unary/binary operator AST metadata for deterministic operator-semantic checks, and condition AST roots inherit reference range metadata.
6. Condition AST precedence is deterministic: `&&` binds tighter than `||`, and unary `!` binds tighter than both.
7. Equality/inequality nodes (`==`, `!=`) preserve typed AST operator metadata and operand subtrees for downstream compatibility checks.

## RTGL-SPEC-JEMPL-005: Strict control-directive validation

1. View template control directives are validated in strict compiler mode even when `jempl.parse` accepts them.
2. Unknown `$*` directives (for example `$iff ...`) emit `RTGL-CHECK-JEMPL-003`.
3. `$for` must match `'$for(item[, index] in iterable)'` or `'$for item[, index] in iterable'`; invalid signatures emit `RTGL-CHECK-JEMPL-003`.
4. Control-directive diagnostics resolve deterministic line locations from the template source key order.
