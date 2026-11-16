# Jempl Semantic Spec

This spec defines the Jempl parse behavior the checker relies on:

- `packages/rettangoli-check/src/rules/jempl.js`
- `packages/rettangoli-check/src/core/parsers.js`

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

## RTGL-SPEC-JEMPL-004: Expression root extraction

Root extraction and the expression reference stream were removed with the expression checks. The compiler
parse entrypoint still guarantees:

1. Conditional expressions preserve typed unary/binary operator AST metadata.
2. Condition AST precedence is deterministic: `&&` binds tighter than `||`, and unary `!` binds tighter than both.
3. Equality/inequality nodes (`==`, `!=`) preserve typed AST operator metadata and operand subtrees.

## RTGL-SPEC-JEMPL-005: Strict control-directive validation

1. View template control directives are validated in strict compiler mode even when `jempl.parse` accepts them.
2. Unknown `$*` directives (for example `$iff ...`) emit `RTGL-CHECK-JEMPL-003`.
3. `$for` must match `'$for item[, index] in iterable'`; invalid signatures emit `RTGL-CHECK-JEMPL-003`.
   Jempl needs whitespace after `$if`, `$elif` and `$for`: a parenthesized form such as `$if(x)`, `$elif(x)` or `$for(item in items)` is a literal key for Jempl, so it emits `RTGL-CHECK-JEMPL-003` (unknown control keyword, with a hint to add the whitespace).
   Empty parentheses after the whitespace (`$if ()`, `$if ( )`, `$elif ( )`) and a bare `$elif` key emit `RTGL-CHECK-JEMPL-003` (missing condition); Jempl evaluates an empty-parentheses condition as false and treats a bare `$elif` as a literal key. A bare `$if` key is a Jempl parse error (`RTGL-CHECK-JEMPL-001`).
4. Control-directive diagnostics resolve deterministic line locations from the template source key order.
5. Runtime property directives (`$when`, `$each`, `$partial`), identified conditional chains (`#id`), and loop modifiers are accepted when validated by Jempl.
