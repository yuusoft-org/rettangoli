# YAHTML Grammar Spec

This spec defines the canonical YAHTML frontend behavior implemented in:

- `packages/rettangoli-check/src/core/parsers.js`
- `packages/rettangoli-check/src/rules/yahtmlAttrs.js`
- `packages/rettangoli-check/src/rules/bindings.js`

## RTGL-SPEC-YAHTML-001: Selector key tokenization and tag extraction

1. Template entries are collected from `.view.yaml` under `template`.
2. Selector keys are resolved from YAML mapping keys and list-item keys, including explicit multiline key forms (`?`).
3. Each key is split and its tag read as FE does, with three differences in the split. FE splits the rendered key at its first space without trimming; check trims the key, splits at the first whitespace of any kind (not only a space), and splits the raw key with `${...}` / `#{...}` skipped. The tag is `selector.split(/[.#]/)[0]` (FE's rule). Tag, selector and binding names always come from the key itself; the line-based scan only supplies the key's line.
4. Control keys (`$if`, `$elif`, `$else`, `$for`, `$when`, `$partial`, `$each`) are excluded from element binding collection.

## RTGL-SPEC-YAHTML-002: Binding prefix semantics

Binding name prefixes map to semantic source types:

- `:name` -> `prop`
- `?name` -> `boolean-attr`
- `.name` -> `legacy-prop`
- `name` -> `attr`

Binding names are FE's (`collectBindingNames`, vendored in `src/core/fe-contracts.js` and parity-tested by `scripts/test-fe-parity.js`), with one deviation: a bare toggle keeps its `?` (`?checked`), so it stays a `boolean-attr` binding. Attribute AST nodes split the attribute text at top-level whitespace with quote/brace/paren awareness.

`@name` is not a binding: FE rejects it, so `@name=value` and a bare `@name` are reported as `RTGL-CHECK-BINDING-001` (see RTGL-SPEC-YAHTML-004). Listeners are declared under `refs.<id>.eventListeners`.

## RTGL-SPEC-YAHTML-003: Expression token extraction delimiters

Expression extraction from binding values recognizes all three delimiters:

- `${...}`
- `#{...}`
- `{{...}}`

Expressions are deduplicated per binding token in deterministic order.

## RTGL-SPEC-YAHTML-004: Invalid forms and diagnostics

1. `legacy-prop` bindings are rejected with deterministic diagnostics (`RTGL-CHECK-YAHTML-002` / `RTGL-CONTRACT-003`).
2. Unsupported attr/prop usage on custom elements emits `RTGL-CHECK-YAHTML-003`.
3. Bindings that FE `parseNodeBindings` throws on are reported on every element, native ones included, and also with `--no-yahtml`: invalid names or tokens, `@event` included (`RTGL-CHECK-BINDING-001`), `?aria-*` / `?data-*` / `?role` toggles (`RTGL-CHECK-BINDING-002`) and duplicate camelCased props (`RTGL-CHECK-BINDING-003`). `RTGL-CHECK-YAHTML-002` / `RTGL-CHECK-YAHTML-003` skip only the names FE rejects as `RTGL-CHECK-BINDING-001`: a plain or `?` name that is not a valid attribute name (after removing the `?`), and a lone `:`. FE accepts any other `:` name (for example `:1x`) and ignores `.` names, so those keep their YAHTML diagnostics when the view YAML parses. FE ignores bare `.prop` and bare `:prop` tokens (no `=`), so in a view whose YAML does not parse (no template AST, only FE's binding names) these tokens get no YAHTML diagnostics: no `RTGL-CHECK-YAHTML-002` for `.prop`, no `RTGL-CHECK-YAHTML-003` for `:prop`. In every view, bare `.prop` and `:prop` tokens provide no prop, so a required prop named only that way is still missing (`RTGL-CHECK-COMPAT-001`). A bare `.prop` token gets no `RTGL-CONTRACT-003` when its key has any other attribute FE reads (an assignment before or after it, such as `input placeholder=x .value` or `input .value placeholder=x`, or another bare or `?` token, such as `div .card hidden` or `input ?checked .value`). A key whose only bare tokens are `.` tokens (`rtgl-input .value`) keeps it until the text scan is removed. The binding rules also run when the view YAML does not parse, on the selector keys found by the text scan.
4. Dynamic binding-name tokens (containing `${...}` or `#{...}`) are ignored by static attr-name validation and by the binding rules.

## RTGL-SPEC-YAHTML-005: Typed template AST and source ranges

`collectTemplateAstFromView` emits:

- `Template` root
- typed `kind` metadata (`YahtmlTemplateAst` / `YahtmlElementAst` / `YahtmlAttributeAst`)
- `Element` nodes with `tagName`, `selector`, `rawKey`
- `Attribute` nodes with `bindingName`, `sourceType`, `name`, `valueText`, `expressions`
- exact ranges: `line`, `column`, `endLine`, `endColumn`, `offset`, `endOffset`, `length`
- raw lexeme preservation (`rawLexeme`) for codeframe/autofix-oriented tooling

Range derivation is deterministic and line-based against the original `.view.yaml` text.
