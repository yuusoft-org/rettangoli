---
template: docs
_bind:
  docs: docs
title: Breadcrumb
tags: documentation
sidebarId: rtgl-breadcrumb
---

A path-navigation component for hierarchical context and route navigation.

## Quickstart

```html codePreview
<rtgl-breadcrumb id="breadcrumb"></rtgl-breadcrumb>

<script>
  const breadcrumb = document.getElementById("breadcrumb");

  breadcrumb.sep = "breadcrumb-arrow";
  breadcrumb.max = 4;
  breadcrumb.items = [
    { id: "home", label: "Home", href: "/" },
    { id: "projects", label: "Projects", path: "/projects" },
    { id: "docs", label: "Docs", path: "/projects/docs" },
    { id: "api", label: "API", current: true },
  ];

  breadcrumb.addEventListener("item-click", (e) => {
    console.log("item-click", e.detail);
  });

  breadcrumb.render();
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Items | `items` (property) | `BreadcrumbItem[]` | `[]` |
| Separator Icon | `sep` | svg key | `breadcrumb-arrow` |
| Max Visible Items | `max` | number (`>= 3`) | no collapse |

## Breadcrumb Item

| Field | Type | Notes |
| --- | --- | --- |
| `label` | string | required |
| `id` | string | optional identity |
| `href` | string | native link navigation |
| `path` | string | app/router navigation intent |
| `current` | boolean | marks current crumb, not interactive |
| `disabled` | boolean | disabled, not interactive |
| `click` | boolean | event-only interactive row |
| `newTab` | boolean | opens `href` in a new tab |
| `rel` | string | link rel (for `href`) |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `item-click` | `{ id, path, href, item, index, trigger }` | Fires when an interactive breadcrumb item is clicked |

## Behavior

### Behavior & precedence

- Interaction precedence is `href` > `path` > `click`.
- `current` and `disabled` disable interaction.
- `id` is identity only and does not control clickability.
- `max` collapses middle items with an ellipsis.
- Separators are inserted automatically between visible items.
- If `newTab` is true and `rel` is omitted, `rel="noopener noreferrer"` is applied.

```html codePreview
<rtgl-breadcrumb id="crumbs"></rtgl-breadcrumb>

<script>
  const crumbs = document.getElementById("crumbs");

  crumbs.sep = "threeDots";
  crumbs.max = 5;
  crumbs.items = [
    { id: "home", label: "Home", href: "/" },
    { id: "workspace", label: "Workspace", path: "/workspace" },
    { id: "library", label: "Library", path: "/workspace/library" },
    { id: "ui", label: "UI", path: "/workspace/library/ui" },
    { id: "components", label: "Components", path: "/workspace/library/ui/components" },
    { id: "breadcrumb", label: "Breadcrumb", current: true },
  ];

  crumbs.addEventListener("item-click", (e) => {
    if (e.detail.path) {
      console.log("route to", e.detail.path);
    }
  });

  crumbs.render();
</script>
```
