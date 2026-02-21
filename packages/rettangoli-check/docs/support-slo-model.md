# Support And SLO Model

## Support Tiers

- `P0`: production outage or critical semantic regression
- `P1`: major functional degradation without full outage
- `P2`: isolated correctness issues with workarounds

## SLO Targets

- `P0` acknowledgement: 15 minutes
- `P1` acknowledgement: 1 hour
- `P2` acknowledgement: 1 business day
- Regression fix lead time:
  - `P0`: same day
  - `P1`: 3 business days
  - `P2`: next scheduled release cycle

## On-Call Responsibilities

- monitor release and gate workflows
- triage parser/security/performance alerts
- coordinate rollback using rollback playbook when needed
