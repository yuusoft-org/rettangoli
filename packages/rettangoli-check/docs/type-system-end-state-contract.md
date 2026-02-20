# Type System End-State Contract

This document defines the Phase 7 (`Contract And Type System`) exit gate contract.

## 1. Guarantee Set

Phase 7 is considered complete when all of the following hold:

- Type lattice normalization and compatibility behavior is stable.
- Type precision/recall benchmark remains lossless (`precision=1.0`, `recall=1.0`).
- Contract/type diagnostics are covered by deterministic conformance scenarios for:
  - required props/defaults
  - expression type checks
  - lifecycle payload signatures
  - event protocol and payload compatibility
  - listener payload contracts
  - method signature and payload contracts
- Positive (valid) contract scenarios remain clean.

## 2. Gate Runner

Authoritative gate command:

```bash
node packages/rettangoli-check/scripts/test-type-system-end-state-gate.mjs
```

The gate runner enforces:

1. Required contract scenarios exist and include expected diagnostic codes.
2. Positive contract scenarios are explicitly clean (`ok=true`, `errorCount=0`).
3. Lattice contract test passes (`test-type-system-contract.mjs`).
4. Type precision benchmark passes (`test-type-precision-benchmark.mjs`).
5. Targeted Phase 7 conformance scenarios execute and pass deterministically.

## 3. Required Scenario Coverage

Negative coverage scenarios:

- `73-compat-required-props` -> `RTGL-CHECK-COMPAT-001`
- `78-expression-boolean-type-mismatch` -> `RTGL-CHECK-EXPR-003`
- `79-lifecycle-on-update-missing-payload` -> `RTGL-CHECK-LIFECYCLE-003`
- `80-compat-unsupported-event` -> `RTGL-CHECK-COMPAT-002`, `RTGL-CHECK-COMPAT-005`
- `101-compat-prop-binding-type-mismatch` -> `RTGL-CHECK-COMPAT-004`
- `104-compat-event-handler-prefix-invalid` -> `RTGL-CHECK-HANDLER-003`
- `106-compat-event-payload-contract-missing-param` -> `RTGL-CHECK-COMPAT-006`
- `107-listener-payload-contract-missing-key` -> `RTGL-CHECK-CONTRACT-004`
- `110-method-signature-nonobject-pattern-invalid` -> `RTGL-CHECK-METHOD-001`
- `112-method-payload-contract-missing-key` -> `RTGL-CHECK-METHOD-003`

Positive coverage scenarios:

- `102-compat-prop-binding-type-match`
- `109-compat-required-prop-with-default`
- `113-method-payload-contract-valid`
