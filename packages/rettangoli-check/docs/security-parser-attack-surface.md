# Security: Parser Attack Surface

Security gates for parser-facing attack surface:

- `scripts/test-yahtml-parser-crash-containment.mjs`
- `scripts/fuzz-yahtml-parser.mjs`
- `scripts/fuzz-jempl-parser.mjs`

Coverage focuses on:

- malformed YAHTML selector keys
- malformed/recursive Jempl control syntax
- malformed YAML payloads
- large/high-entropy template payloads

These checks are required before GA promotion and publish workflows.
