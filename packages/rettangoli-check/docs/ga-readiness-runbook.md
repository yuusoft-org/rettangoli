# GA Readiness Runbook

## Gate Commands

```bash
cd packages/rettangoli-check
node ./test/run-scenarios.mjs
```

## Required Gate Families

- diagnostics/reporting contracts
- scenario conformance
- FE/frontend contract coverage
- targeted type/contract scenario coverage

## Approval Checklist

1. All gate commands pass.
2. Roadmap critical path checkpoints are complete.
3. Release docs/playbooks are current.
4. Two consecutive release candidates pass full gates.
