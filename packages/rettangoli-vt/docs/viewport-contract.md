# VT Viewport Contract

Last updated: 2026-02-09

Status: implemented.

This document defines the public contract for viewport customization in `rtgl vt`.

## Goals

- Support one or many viewports in config.
- Support per-spec viewport override in frontmatter.
- Keep deterministic screenshot output paths for report/accept.

## Config Shape

`rettangoli.config.yaml`:

```yaml
vt:
  viewport:
    id: desktop
    width: 1280
    height: 720
```

or:

```yaml
vt:
  viewport:
    - id: desktop
      width: 1280
      height: 720
    - id: mobile
      width: 390
      height: 844
```

`viewport` is a union:

- object (single viewport)
- array of objects (multi-viewport run)

## Frontmatter Shape

Spec frontmatter can override `vt.viewport`:

```yaml
---
viewport:
  - id: tablet
    width: 768
    height: 1024
---
```

## Validation Rules

Each viewport object must contain:

- `id` (required, non-empty string)
- `width` (required, integer >= 1)
- `height` (required, integer >= 1)

Additional rules:

- `id` values must be unique case-insensitively within the same viewport array.
- No auto-generated ids.
- Duplicate ids throw validation errors.

## Resolution Order

For each spec:

1. `frontMatter.viewport` (if present)
2. `vt.viewport` (if present)
3. internal default viewport (current runtime default)

## Execution Behavior

- When `viewport` resolves to an array, the spec runs once per viewport in declared order.
- When `viewport` resolves to an object, the spec runs once.

## Screenshot Naming

To avoid collisions in multi-viewport runs, viewport id is included in screenshot filename:

- `<base>--<viewportId>-01.webp`
- `<base>--<viewportId>-02.webp`

Example:

- `components/forms/login--desktop-01.webp`
- `components/forms/login--mobile-01.webp`

## Report / Accept Expectations

- `report` compares candidate/reference per viewport-specific filename.
- `accept` copies candidate to reference for viewport-specific files as-is.

## Selector Compatibility

- Existing `--folder`, `--group`, and `--item` selectors remain unchanged at CLI level.
- Internal selector matching must normalize viewport suffix before item matching.
