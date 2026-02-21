# Dependency Update Policy And Audit

## Policy

- Lockfile (`bun.lock`) is authoritative and required for all CI/release workflows.
- Dependency versions must not use `*` or `latest`.
- Security-relevant parser/runtime dependencies require explicit review notes in PR description.
- Dependency upgrades are batched weekly unless a security advisory requires immediate patching.

## Audit Workflow

Policy audit is currently manual/reviewer-driven.

Manual review checklist:

1. Confirm changelog and breaking changes.
2. Confirm lockfile delta is minimal and expected.
3. Confirm parser-facing dependencies are fuzz/security-tested post-upgrade.
