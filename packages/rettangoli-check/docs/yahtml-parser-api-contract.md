# YAHTML Parser API Contract

The template key APIs in `packages/rettangoli-check/src/core/parsers.js`.

## API Surface

1. `parseSelectorKey(key: string)`
- Splits one template key into selector and attribute text. FE splits the rendered key (after Jempl) at its
  first space, without trimming. Check differs in three ways: it trims the key first, it splits at any
  whitespace (tab, NBSP) rather than only at a space, and it splits the raw key, skipping `${...}` / `#{...}`.
- Output: `{ selector, attrsText, tagName, bindingNames }`.
  - `tagName` is `selector.split(/[.#]/)[0]` (FE's tag rule).
  - `bindingNames` are FE's binding names for `attrsText` (`parseBindingNames`), with one deviation: a bare
    toggle keeps its `?` (`?checked`).

2. `parseYahtmlSelectorKey({ rawKey, line, lineText, lineOffsets, parsedKey })`
- Builds the element AST of one key. Without `parsedKey` it uses `parseSelectorKey(String(rawKey || ""))`.
- Output: `{ ast: YahtmlElementAst }`.
- `ast.tagName` and `ast.selector` come from `parsedKey`; `ast.attributes` has one node per top-level
  attribute token of `parsedKey.attrsText`.
- `ast.range` and `ast.attributes[*].range` include `line`, `column`, `endLine`, `endColumn`, `offset`,
  `endOffset`, `length`.
- `ast.rawLexeme` and `ast.attributes[*].rawLexeme` keep the raw source text.

3. `collectTemplateAstFromView({ viewText, viewYaml, selectorBindings })`
- Builds the template AST from the view's selector bindings (default:
  `collectSelectorBindingsFromView({ viewText, viewYaml })`), one element node per binding, in the same order.
- Output: `{ type: "Template", kind: "YahtmlTemplateAst", nodes: YahtmlElementAst[] }`.

## Determinism Contract

For identical inputs, the APIs above return identical output (node order, attribute order and ranges).

Validation scripts:

- `bun run --cwd packages/rettangoli-check test:yahtml-parser-snapshots`
- `bun run --cwd packages/rettangoli-check test:yahtml-parser-crash`
- `bun run --cwd packages/rettangoli-check test:fuzz-yahtml-parser`
- `bun run --cwd packages/rettangoli-check test:fe-parity` (the key split and binding names against FE)

## Failure Handling Contract

- The APIs do not throw on malformed keys. Inputs FE throws on are reported by the binding rules
  (`RTGL-CHECK-BINDING-*`).
- Malformed keys are covered by the crash-containment and fuzz scripts.
