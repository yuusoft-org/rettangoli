# GA Readiness Runbook

## Gate Command

```bash
cd packages/rettangoli-check
node ./scripts/test-ga-readiness-gate.mjs
```

## Required Gate Families

- diagnostics/reporting contracts
- LSP conformance + LSP SLA
- incremental/performance gates
- parser security scan + adversarial inputs
- release signature + provenance verification
- dependency policy audit

## Approval Checklist

1. All gate commands pass.
2. Roadmap critical path checkpoints are complete.
3. Release docs/playbooks are current.
4. Two consecutive release candidates pass full gates.
