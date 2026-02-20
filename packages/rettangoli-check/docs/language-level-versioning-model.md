# Language Level Versioning Model

## Levels

Supported language levels are ordered and versioned:

1. `strict-legacy-parity`
2. `strict-deterministic-core`
3. `compiler-platform-v1`

The canonical list is implemented in `src/cli/languageLevels.js`.

## Pinning

Projects pin level through `rettangoli.config.yaml`:

```yaml
language:
  level: strict-deterministic-core
```

`rtgl-check doctor` reports configured/resolved level and supported transitions.

## Transition Policy

- Forward transitions must be explicit and validated in CI.
- Backward transitions are allowed only for rollback windows and must be documented.
- Unknown levels are rejected by doctor and treated as invalid governance state.
