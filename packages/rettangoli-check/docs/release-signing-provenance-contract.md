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

## Verification

Use the release tooling scripts directly during release preparation:

- `scripts/release-sign-artifacts.mjs`
- `scripts/release-verify-artifacts.mjs`
- `scripts/release-generate-provenance.mjs`
- `scripts/release-verify-provenance.mjs`
