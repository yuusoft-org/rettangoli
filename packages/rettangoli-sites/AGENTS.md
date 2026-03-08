# AGENTS Guide: `packages/rettangoli-sites`

This package is not allowed to guess Rettangoli behavior.
When working in `packages/rettangoli-sites`, use this exact source-of-truth order.

## Required Read Order

1. `apps/rettangoli.dev/static/llms.txt`
2. `packages/rettangoli-sites/DEVELOPMENT.md`
3. `packages/rettangoli-ui/DEVELOPMENT.md`
4. Relevant local docs under `apps/rettangoli.dev/pages/`

Load only the docs needed for the task:
- UI layout/responsive behavior:
  - `apps/rettangoli.dev/pages/ui/docs/introduction/component-model.md`
  - `apps/rettangoli.dev/pages/ui/docs/introduction/responsiveness.md`
- UI primitive/component usage:
  - the specific `apps/rettangoli.dev/pages/ui/docs/primitives/*.md`
  - the specific `apps/rettangoli.dev/pages/ui/docs/components/*.md`
- Sites authoring/runtime behavior:
  - `apps/rettangoli.dev/pages/sites/docs/reference/configuration.md`
  - `apps/rettangoli.dev/pages/sites/docs/reference/template-functions.md`
  - `apps/rettangoli.dev/pages/sites/docs/reference/built-in-templates-and-partials.md`
  - `apps/rettangoli.dev/pages/sites/docs/reference/data-contract-schemas.md`
- VT coverage and behavior:
  - `apps/rettangoli.dev/pages/vt/docs/reference/configuration.md`
  - `apps/rettangoli.dev/pages/vt/docs/reference/frontmatter.md`
  - `apps/rettangoli.dev/pages/vt/docs/reference/viewport.md`
  - `apps/rettangoli.dev/pages/vt/docs/reference/sites-integration.md`

## Package Contract

Use `packages/rettangoli-sites/DEVELOPMENT.md` for:
- built-in template and partial product rules
- machine-readable contract registry rules
- VT and release coverage expectations
- change flow for stable template interfaces

Canonical package docs also matter:
- `packages/rettangoli-sites/README.md`
- `packages/rettangoli-sites/sites/README.md`
- `packages/rettangoli-sites/docs/architecture-and-analysis.md`
- `packages/rettangoli-sites/docs/builtin-assets-contract.md`

## Non-Negotiable Rules

- Do not invent `rtgl-*` tags, attrs, events, or responsive prefixes.
- Do not guess CSS/layout behavior when UI docs already define it.
- Do not add or change a stable built-in template/partial without updating:
  - published file in `sites/`
  - `sites/contracts/builtin-asset-registry.yaml`
  - `sites/schemas/data-contract.schema.yaml` when interface changes
  - docs
  - VT coverage when rendering changes
- Do not add hidden runtime dependencies on consumer-local `/public/*` files.
- Prefer shared partials/theme bundles over copy-pasted template forks.
- Treat `rettangoli-sites` built-ins as production surface, not examples.

If this file conflicts with `DEVELOPMENT.md`, `DEVELOPMENT.md` wins.
