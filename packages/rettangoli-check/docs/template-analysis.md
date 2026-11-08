# Template Analysis Pipeline (YAML + Jempl + template keys)

How the checker finds a view's template keys and reads them. Entry points are in
`packages/rettangoli-check/src/core/parsers.js`; `src/core/model.js` wires them together.

## Layers

1. YAML: `.view.yaml` is parsed (`parseYamlSafe`). A parse failure is `RTGL-CHECK-PARSE-001`.
2. Jempl: `view.template` is parsed with `jempl` (`parseJemplForCompiler`). Selector keys are collected from
   the AST: object `properties[].key`, conditional `bodies[]`, loop `body` and array `items[]`. Control keys
   (`$if`, `$elif`, `$else`, `$for`, `$when`, `$partial`, `$each`) are skipped. If Jempl cannot parse the
   template, no keys are collected; the Jempl rules report the error.
3. Keys: each key is read once, from the key itself, with `parseSelectorKey`: a split into selector and
   attribute text, FE's tag rule (`selector.split(/[.#]/)[0]`) and FE's binding names (a bare `?name` keeps its
   `?`). FE splits the rendered key at its first space without trimming; check trims the key, splits at the
   first whitespace of any kind (not only a space), and splits the raw key with `${...}` / `#{...}` skipped.
   Object-notation keys of an element's value (`rtgl-button: {aria-label: x}`) are added to its binding
   names.
4. Element AST: `collectTemplateAstFromView` builds one element node per key, with attribute nodes, value
   expressions and source ranges (`parseYahtmlSelectorKey`).

The rules read the selector bindings (`tagName`, `attrsText`, `bindingNames`, `line`) and the element AST
(attribute ranges for columns).

## Line mapping

- Line candidates are collected from the template's source lines (list-item keys, mapping keys and explicit
  `?` keys), in source order.
- Keys are matched to candidates in order. A candidate gives only the line; the key's tag, selector and
  names never come from a candidate.
- When no candidate matches a key exactly (flow mappings, escaped or multi-line keys), the key gets the next
  candidate's line.

## Text scan

`collectSelectorBindingsFromViewText` reads keys from the source lines without the YAML parser. It is used
when the view YAML does not parse or has no `template` key, so that the binding rules still run, and it is
the input of the text-scan `RTGL-CONTRACT-003` check (`findLegacyDotPropBinding`). Decision D10 in
`ROADMAP.md` proposes removing it.

## Known limits

- Line mapping is order-based, not source-range based, and multi-line keys can get wrong columns.
