# Jempl Parser API Contract

This document defines the compiler-facing Jempl frontend API implemented in:
`packages/rettangoli-check/src/core/parsers.js`

## Purpose

Provide one canonical parse entrypoint for Jempl template/payload parsing so rules and semantic passes do not diverge.

## API

`parseJemplForCompiler({ source, viewText, fallbackLine, strictControlDirectives })`

Return shape:

- `ast`: raw `jempl.parse` AST (`null` on parse failure)
- `typedAst`: compiler-typed AST with stable `kind` labels per node (`null` on parse failure)
- `parseError`: normalized parse error (`{ line, message }`) or `null`
- `controlDiagnostics`: strict control-directive diagnostics (`[]` when disabled or parse fails)

## Deterministic Guarantees

1. Parse error message normalization is stable (`normalizeJemplErrorMessage`).
2. Typed AST mapping is pure and deterministic for identical input.
3. Control-directive diagnostics are emitted in deterministic traversal order.
4. Directive line mapping is resolved by template key occurrence order in source text.
5. Unary/binary nodes in `typedAst` carry stable `operator` labels (`!`, `==`, `!=`, `>`, `<`, `>=`, `<=`, `&&`, `||`, `in`, `+`, `-`).
6. Mixed-condition precedence in `typedAst` is deterministic (`!` > `&&` > `||`).

## Strict Control Directive Rules

When `strictControlDirectives: true`:

1. Unknown `$*` directives are rejected.
2. `$if` and `$elif` require a non-empty condition.
3. `$else` must be exactly `$else`.
4. `$for` must match `'$for(item[, index] in iterable)'` or `'$for item[, index] in iterable'`.

Diagnostics produced by this contract are surfaced in checker rules as `RTGL-CHECK-JEMPL-003`.
