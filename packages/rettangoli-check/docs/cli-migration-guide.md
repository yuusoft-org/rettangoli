# CLI Migration Guide

This guide covers migration from check-only workflows to the unified Phase 9 CLI surface.

## 1. Command Mapping

Previous check-only usage:

- `rtgl-check --dir src/components --format json`

Unified command usage:

- `rtgl-check check --dir src/components --format json`
- `rtgl-check compile --dir src/components --format json`
- `rtgl-check doctor --dir src/components --format json`
- `rtgl-check baseline capture --file .rettangoli/baseline.json`
- `rtgl-check baseline verify --file .rettangoli/baseline.json`
- `rtgl-check policy validate --file ./policy.yaml`

Note: `rtgl-check` with no subcommand still routes to `check` for backward compatibility.

## 2. CI Migration Steps

1. Keep existing `rtgl-check` check command in CI.
2. Add `rtgl-check compile --format json` as a semantic parity gate.
3. Add `rtgl-check doctor --format json` as an environment preflight gate.
4. Add policy validation for org packs: `rtgl-check policy validate --file <pack>`.
5. Add baseline verification gate where staged adoption is required.

## 3. Mode Migration

- CI should use `--mode strict` (default).
- Local exploration may use `--mode local-non-authoritative`.
- `local-non-authoritative` mode is intentionally rejected in CI to prevent non-authoritative gates.

## 4. JSON Consumers

For machine consumers:

- Pin to `contractVersion: 1` payloads.
- Ignore unknown fields to remain forward-compatible.
- Treat exit codes from `EXIT_CODE_MATRIX` as authoritative.
