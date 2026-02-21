# Governance Handbook

## 1. Ownership

- Language-level and semantic contract changes require compiler-platform owner review.
- Policy pack contract changes require governance review.

## 2. Required Gates

A release is allowed only if all pass:

- `test:scenarios`
- FE frontend contract checks (`test:fe-frontend-*`)

## 3. Change Protocol

1. Propose change with compatibility impact summary.
2. Map change to language level transition path.
3. Update migration docs if behavior changes.
4. Land conformance and governance tests.

## 4. Audit Trail

- roadmap and compiler journal entries are append-only evidence
- scenario and contract evidence from CI are retained for release audit
