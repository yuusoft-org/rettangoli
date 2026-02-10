# AGENTS Guide: `packages/rettangoli-fe`

This file is for coding agents working inside `packages/rettangoli-fe`.

## Planning Source

- Use `packages/rettangoli-fe/docs/roadmap.md` as the roadmap source.
- Roadmap items are tagged with priority:
  - `[P0]` critical
  - `[P1]` important
  - `[P2]` backlog
- When adding or updating roadmap items, always include one priority tag.

## Spec Source Of Truth

Treat docs in `packages/rettangoli-fe/docs/` as the interface spec:
- `overview.md`
- `view.md`
- `store.md`
- `handlers.md`
- `schema.md`
- `methods.md`
- `constants.md`

Keep implementation and tests aligned with these docs.

## Working Rules

- Prefer pure-function contract tests in Puty where possible.
- Use Vitest for integration/runtime behavior that needs browser-like execution.
- For end-to-end testing, use `@rettangoli/vt` against `examples/` — write VT specs with interaction steps and assert via screenshot comparison. Do not build a separate Playwright/Cypress E2E suite.
- Keep schema-first contract behavior intact:
  - `.schema.yaml` required
  - `.view.yaml` is view-only
  - props are the single component input model
- Avoid broad refactors unrelated to the requested task.
