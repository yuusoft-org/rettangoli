# Security: Parser Attack Surface

Security gates for parser-facing attack surface:

- `scripts/test-parser-security-scan.mjs`
- `scripts/test-adversarial-inputs.mjs`

Coverage focuses on:

- malformed YAHTML selector keys
- malformed/recursive Jempl control syntax
- malformed YAML payloads
- large/high-entropy template payloads

These checks are required before GA promotion and publish workflows.
