# YAHTML Grammar Spec

This spec defines the canonical YAHTML frontend behavior implemented in:

- `packages/rettangoli-check/src/core/parsers.js`
- `packages/rettangoli-check/src/rules/yahtmlAttrs.js`

## RTGL-SPEC-YAHTML-001: Selector key tokenization and tag extraction

1. Template entries are collected from `.view.yaml` under `template`.
2. Selector keys are resolved from YAML mapping keys and list-item keys, including explicit multiline key forms (`?`).
3. Tag extraction prefers `yahtml.parseElementKey`; if parser failure occurs, fallback uses local selector parsing.
4. Control keys (`$if`, `$elif`, `$else`, `$for`) are excluded from element binding collection.

## RTGL-SPEC-YAHTML-002: Binding prefix semantics

Binding name prefixes map to semantic source types:

- `@name` -> `event`
- `:name` -> `prop`
- `?name` -> `boolean-attr`
- `.name` -> `legacy-prop`
- `name` -> `attr`

Binding tokens are split by top-level whitespace with quote/brace/paren awareness.

## RTGL-SPEC-YAHTML-003: Expression token extraction delimiters

Expression extraction from binding values recognizes all three delimiters:

- `${...}`
- `#{...}`
- `{{...}}`

Expressions are deduplicated per binding token in deterministic order.

## RTGL-SPEC-YAHTML-004: Invalid forms and diagnostics

1. `legacy-prop` bindings are rejected with deterministic diagnostics (`RTGL-CHECK-YAHTML-002` / `RTGL-CONTRACT-003`).
2. Unsupported attr/prop usage on custom elements emits `RTGL-CHECK-YAHTML-003`.
3. Event bindings are validated in compatibility/listener rules, not YAHTML attr allowlist rules.
4. Dynamic binding-name tokens are ignored by static attr-name validation.

## RTGL-SPEC-YAHTML-005: Typed template AST and source ranges

`collectTemplateAstFromView` emits:

- `Template` root
- typed `kind` metadata (`YahtmlTemplateAst` / `YahtmlElementAst` / `YahtmlAttributeAst`)
- `Element` nodes with `tagName`, `selector`, `rawKey`
- `Attribute` nodes with `bindingName`, `sourceType`, `name`, `valueText`, `expressions`
- exact ranges: `line`, `column`, `endLine`, `endColumn`, `offset`, `endOffset`, `length`
- parse-oriented CST payload and `parseDiagnostics` for recoverable YAHTML parse issues
- raw lexeme preservation (`rawLexeme`) for codeframe/autofix-oriented tooling

Range derivation is deterministic and line-based against the original `.view.yaml` text.
