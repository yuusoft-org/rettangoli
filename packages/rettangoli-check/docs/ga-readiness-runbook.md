# GA Readiness Runbook

## Gate Commands

```bash
cd packages/rettangoli-check
node ./test/run-scenarios.mjs
node ./scripts/test-reliability-gates.mjs
node ./scripts/test-lsp-contract.mjs
```

## Required Gate Families

- diagnostics/reporting contracts
- LSP conformance
- reliability gates
- targeted type/contract scenario coverage

## Approval Checklist

1. All gate commands pass.
2. Roadmap critical path checkpoints are complete.
3. Release docs/playbooks are current.
4. Two consecutive release candidates pass full gates.
