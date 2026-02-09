---
template: vt-documentation
title: Viewport
tags: documentation
sidebarId: vt-viewport
---

VT supports viewport configuration globally and per spec.

## Global viewport (`rettangoli.config.yaml`)

Single viewport:

```yaml
vt:
  viewport:
    id: desktop
    width: 1280
    height: 720
```

Multiple viewports:

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

## Per-spec viewport (frontmatter)

Spec frontmatter can override the global `vt.viewport`:

```yaml
---
viewport:
  - id: tablet
    width: 768
    height: 1024
---
```

## Validation Rules

Each viewport object requires:

- `id` (required string)
- `width` (integer `>= 1`)
- `height` (integer `>= 1`)

Additional rules:

- `id` is required (no auto-generated IDs).
- IDs must be unique case-insensitively inside one viewport array.

## Resolution Order

For each spec, VT uses:

1. `frontMatter.viewport` (if defined)
2. otherwise `vt.viewport`
3. otherwise internal default viewport

## Screenshot naming

When viewport IDs are configured, output filenames include the viewport ID:

- `<base>--<viewportId>-01.webp`
- `<base>--<viewportId>-02.webp`

Example:

- `components/forms/login--desktop-01.webp`
- `components/forms/login--mobile-01.webp`

## Per-step viewport changes

You can also change viewport inside `steps` using:

```text
setViewport <width> <height>
```

This change is scoped to the current running spec session only. The next spec starts from its resolved config/frontmatter viewport.
