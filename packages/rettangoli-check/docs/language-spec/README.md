# Rettangoli Language Specs (Phase 1 Authoritative Set)

This folder is the canonical semantic source for Phase 1 (`WS01`, `CP1`) and is validated against the scenario corpus.

Authoritative docs:

- `packages/rettangoli-check/docs/language-spec/yahtml-grammar-spec.md`
- `packages/rettangoli-check/docs/language-spec/jempl-semantic-spec.md`
- `packages/rettangoli-check/docs/language-spec/fe-contract-semantic-spec.md`
- `packages/rettangoli-check/docs/language-spec/symbol-resolution-order.md`
- `packages/rettangoli-check/docs/language-spec/language-level-compatibility-matrix.md`
- `packages/rettangoli-check/docs/language-spec/conformance-contract.md`

Phase 2 parser contract docs:

- `packages/rettangoli-check/docs/yahtml-parser-api-contract.md`

Phase 3 parser contract docs:

- `packages/rettangoli-check/docs/jempl-parser-api-contract.md`

Machine-readable spec IDs:

- `packages/rettangoli-check/docs/language-spec/spec-index.json`

Conformance binding contract:

1. Every scenario `expected.json` must declare non-empty `specRefs`.
2. Every `specRefs` entry must exist in `spec-index.json`.
3. `packages/rettangoli-check/test/run-scenarios.js` enforces this contract.

The IDs are stable and intentionally versionable. When semantics change, update the spec doc first, then conformance refs.
