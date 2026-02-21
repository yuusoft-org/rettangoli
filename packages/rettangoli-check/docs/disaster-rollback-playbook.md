# Disaster Rollback Playbook

## Trigger Conditions

- Release introduces blocker diagnostics regression.
- Parser/security gate fails after publish candidate.
- LSP or compile path causes broad workspace failures.

## Immediate Actions

1. Freeze new publishes.
2. Identify last known good tag.
3. Execute rollback release from known good tag.
4. Broadcast rollback status in incident channel.

## Technical Steps

1. Re-run GA gate scripts on rollback candidate.
2. Publish rollback package versions.
3. Verify artifact signatures and provenance for rollback artifacts.
4. Run conformance + reliability + performance + security gates.

## Exit Criteria

- Consumers can install rollback package successfully.
- CI gates return green on rollback tag.
- Incident postmortem and prevention action items are recorded.
