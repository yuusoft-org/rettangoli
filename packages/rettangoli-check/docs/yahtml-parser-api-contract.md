# YAHTML Parser API Contract

This document defines the current Phase 2 contract for the YAHTML frontend parser APIs implemented in:

- `packages/rettangoli-check/src/core/parsers.js`

## API Surface

1. `tokenizeYahtmlSelectorKey(rawKey: string)`
- Deterministically tokenizes one YAHTML selector key into a typed token stream.
- Output shape:
  - `kind: "YahtmlSelectorTokenStream"`
  - `raw: string`
  - `selectorToken: YahtmlSelectorToken | null`
  - `attributeTokens: YahtmlAttributeToken[]`
- Each token includes:
  - `kind`
  - `raw`
  - `startOffset`
  - `endOffset`
  - `length`
  - `column`
  - `endColumn`

2. `parseYahtmlSelectorKey({ rawKey, line, lineText, lineOffsets, filePath })`
- Parses one selector key into typed AST/CST plus structured parse diagnostics.
- Output shape:
  - `ast: YahtmlElementAst`
  - `cst: YahtmlElementCst`
  - `diagnostics: Diagnostic[]`
- `ast.range` includes exact:
  - `line`, `column`, `endLine`, `endColumn`, `offset`, `endOffset`, `length`
- `ast.attributes[*].range` includes the same range fields.
- `ast.rawLexeme` and `ast.attributes[*].rawLexeme` preserve raw lexemes for codeframes/autofix.

3. `collectTemplateAstFromView({ viewText, viewYaml })`
- Produces typed template-level AST/CST from `.view.yaml` template selectors.
- Output shape:
  - `type: "Template"`
  - `kind: "YahtmlTemplateAst"`
  - `nodes: YahtmlElementAst[]`
  - `cst: { kind: "YahtmlTemplateCst", nodes: YahtmlElementCst[] }`
  - `parseDiagnostics: Diagnostic[]`

## Determinism Contract

For identical `rawKey` / `viewText` inputs, all APIs above must be byte-stable across repeated runs:

- token boundaries and offsets are identical
- AST/CST node ordering is identical
- diagnostics ordering and ranges are identical

Validation scripts:

- `bun run --cwd packages/rettangoli-check test:yahtml-parser-snapshots`
- `bun run --cwd packages/rettangoli-check test:yahtml-parser-crash`
- `bun run --cwd packages/rettangoli-check test:fuzz-yahtml-parser`

## Failure Handling Contract

- Parsing must fail closed into structured diagnostics where possible.
- Parser APIs must not throw on malformed selector keys in normal operation paths.
- Malformed token and selector cases are covered by crash-containment and fuzz scripts.
