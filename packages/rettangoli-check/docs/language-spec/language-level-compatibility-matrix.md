# Language-Level Compatibility Matrix

This matrix defines Phase 1 semantic levels. It is authoritative for scenario `specRefs` and forward governance.

| Level ID | Name | Status | Semantic Scope | Compatibility Notes |
| --- | --- | --- | --- | --- |
| `RTGL-SPEC-LVL-001` | `strict-legacy-parity` | current baseline | FE parity checks + schema/listener/symbol/lifecycle checks + YAHTML attr checks | Keeps current diagnostic families and strict legacy `.prop` rejection. |
| `RTGL-SPEC-LVL-002` | `strict-deterministic-core` | current baseline | Level 001 + deterministic scenario contracts (repeatability, Oxc/regex parity, mutation stability) | Enforced by `test/run-scenarios.mjs`; all analyzer scenarios must remain deterministic. |
| `RTGL-SPEC-LVL-003` | `compiler-platform-v1` | planned target | Unified check/compile/lsp semantics with versioned IR and incremental engine | Not yet implemented; tracked by phases 2-15 and CP2-CP12. |

Versioning rules for Phase 1:

1. Level 001 and 002 behavior changes require spec-doc update and scenario updates in the same change.
2. New diagnostics under existing semantics extend, but must not silently change prior pass/fail outcomes without explicit roadmap note.
3. Level 003 remains forward-looking until critical path items CP2+ are complete.
