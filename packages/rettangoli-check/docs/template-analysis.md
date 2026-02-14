# Template Analysis Pipeline (YAML + Jempl + YAHTML)

This checker treats template analysis as a 4-layer pipeline:

1. YAML layer
- Source: `.view.yaml`
- Purpose: parse document and locate `template`.

2. FE selector/binding layer (pre-pass)
- Source: template key candidates from view source lines
- Parser/helpers: Rettangoli FE binding logic (`collectBindingNames` via checker `parseBindingNames`)
- Purpose: preserve FE-specific attrs/props semantics before control-flow traversal.

3. Jempl layer
- Source: `view.template` (JSON/YAML value)
- Parser: `jempl` (`parse`)
- Purpose: understand control-flow (`$if/$elif/$else/$for`) and collect selector keys from reachable branches.

4. YAHTML layer
- Source: selector keys from Jempl AST object properties
- Parser: `yahtml` (`parseElementKey`)
- Purpose: parse element/tag syntax robustly (`tag`, `#id`, `.class`, attrs with quoted/unquoted values).

## Why this order

- FE performs project-specific attrs/props token handling that checker must preserve.
- `$if/$for` are Jempl constructs, not YAHTML syntax.
- YAHTML parsing alone cannot represent Jempl control directives.
- We pre-parse candidate selector lines with FE logic, then traverse Jempl AST bodies, then parse concrete selector keys as YAHTML.

## Current implementation

- Selector extraction entrypoint:
  - `packages/rettangoli-check/src/core/parsers.js`
  - `collectSelectorBindingsFromView({ viewText, viewYaml })`

- Core flow:
  - FE pre-pass over template key candidates from source lines (selector split + binding tokens).
  - parse Jempl AST from `viewYaml.template`.
  - collect selector keys from Jempl AST:
    - object `properties[].key`
    - conditional `bodies[]`
    - loop `body`
    - array `items[]`
  - skip control keys (`$if`, `$elif`, `$else`, `$for`).
  - parse each key with `parseElementKey`.
  - for each selected key, use FE-preparsed selector/binding data when available (same source key), fallback to on-demand FE parse otherwise.

- Line mapping:
  - line candidates are collected from template lines (list keys and mapping keys) in source order.
  - selector keys are matched to candidates in-order for deterministic diagnostics.

## Fallback behavior

If Jempl parsing fails during selector extraction, checker falls back to previous text heuristic:
- `collectSelectorBindingsFromViewText(viewText)`

This keeps analysis resilient while Jempl parse errors are still reported by dedicated Jempl rules.

## Known limitation

- Key-to-line mapping is order-based for dynamic templates, not full source-range based.
- Full `line:column` precision requires source-range metadata in upstream parsers.
