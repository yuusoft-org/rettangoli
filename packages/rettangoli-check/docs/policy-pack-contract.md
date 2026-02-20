# Policy Pack Contract

Policy pack loader contract is implemented in `src/cli/policy.js`.

## Schema

- Canonical schema: `docs/policy-pack-schema.json`
- Required:
  - `name` (non-empty string)
  - `rules` (array of rule objects)
- Rule required field:
  - `id` (non-empty string)
- Rule optional fields:
  - `severity` (`error` | `warn`)
  - `enabled` (boolean)
  - `description` (string)
  - `tags` (string[])
  - `metadata` (object)

## Safety Boundaries

- unsupported top-level keys are rejected
- unsupported rule keys are rejected
- unsafe key names (`script`, `command`, `eval`) are rejected
- max rule count is bounded (`500`)

## Signing And Verification

Supported signature object:

```yaml
signature:
  algorithm: sha256
  digest: <64-char lowercase hex>
```

Digest is computed from canonicalized policy content excluding `signature`.
Verification is available through:

```bash
rtgl-check policy validate --file <pack.yaml> --verify-signature
```
