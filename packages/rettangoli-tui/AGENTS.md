# AGENTS Guide: `packages/rettangoli-tui`

This package is a proof-of-concept TUI runtime that mirrors `packages/rettangoli-fe` structure.

## Working Rules

- Keep FE component contracts intact (`.schema.yaml`, `.view.yaml`, `.store.js`, `.handlers.js`, optional `.methods.js`, `.constants.yaml`).
- Preserve structure parity with `packages/rettangoli-fe` unless there is a TUI-specific reason to diverge.
- Keep terminal rendering logic under `src/tui/`, primitive renderers under `src/primitives/`, and composite TUI components under `src/components/`.
- Prefer small, deterministic renderer functions that return plain strings.
