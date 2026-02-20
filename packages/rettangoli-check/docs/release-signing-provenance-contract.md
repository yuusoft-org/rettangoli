# Release Signing And Provenance Contract

## Artifact Signing

Scripts:

- `scripts/release-sign-artifacts.mjs`
- `scripts/release-verify-artifacts.mjs`

Outputs:

- `release-manifest.json`
- `release-signature.json`

Signature algorithm: `hmac-sha256`.

## Provenance

Scripts:

- `scripts/release-generate-provenance.mjs`
- `scripts/release-verify-provenance.mjs`

Output:

- `release-provenance.json`

Provenance includes builder metadata, source metadata, and per-artifact digest subjects.

## Gate

Release provenance gate:

```bash
cd packages/rettangoli-check
node ./scripts/test-release-provenance-gate.mjs
```
