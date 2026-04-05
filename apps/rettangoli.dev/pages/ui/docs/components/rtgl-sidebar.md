---
template: docs
_bind:
  docs: docs
title: Sidebar
tags: documentation
sidebarId: rtgl-sidebar
---

A navigation sidebar component with header, grouped items, and selectable states.

## Quickstart

```html codePreview
<rtgl-sidebar id="sidebar"></rtgl-sidebar>

<script>
  const sidebar = document.getElementById("sidebar");
  sidebar.selectedItemId = "about";
  sidebar.header = {
    label: "Rettangoli",
    image: {
      src: "/public/sample1.jpg",
      width: 32,
      height: 32,
      alt: "Logo",
    },
  };
  sidebar.items = [
    { id: "home", label: "Home", icon: "home" },
    { id: "about", label: "About", icon: "info" },
    { type: "groupLabel", label: "Admin" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];
  sidebar.render();
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Selected Item | `selected-item-id` / `selectedItemId` | string | - |
| Mode | `mode` | `full`, `shrunk`, `shrunk-lg` | `full` |
| Width Override | `w` | string | mode-based width |
| Right Border Width | `bwr` | string | `xs` |
| Hide Header | `hide-header` / `hideHeader` | boolean | `false` |
| Compact Tooltip | `tooltip` | boolean | `false` |
| Header | `header` (property) | object | `{}` |
| Items | `items` (property) | array | `[]` |

### Header Shape
- `label`, `href`, `path`, `testId`
- `image: { src, width, height, alt, href?, path? }`

### Item Shape
- `id`, `label`, `icon`, `href`, `path`, `type`, `tooltip`, `testId`
- `title` is deprecated and still supported as a fallback for `label`
- `type: "groupLabel"` for section labels
- `type: "divider"` for a horizontal separator line
- `type: "spacer"` for a flexible spacer that pushes following rows to the bottom
- `items: [...]` for nested item flattening
- `show-compact-tooltip` / `showCompactTooltip` is deprecated and still supported as an alias for `tooltip`

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `header-click` | `{ path }` | Fires when path-driven header element is clicked |
| `item-click` | `{ item }` | Fires when an item row is clicked |

## Behavior

### Behavior & precedence

- `selected-item-id` drives active styling.
- `mode` changes width and label/icon density.
- `w` overrides computed width (for example `w="f"` fills the parent width).
- `bwr` controls right border width (`bwr="none"` hides the border).
- `hide-header` hides the header block.
- `tooltip` enables hover tooltips for compact modes and uses `item.tooltip`, then `item.label`, then deprecated `item.title`.
- `show-compact-tooltip` / `showCompactTooltip` remains supported as a deprecated alias.
- `type: "divider"` inserts a non-interactive rule into the list flow.
- `type: "spacer"` consumes remaining vertical space so following rows sit at the bottom when the sidebar has extra height.
- `divider` and `spacer` work in both full and compact sidebar modes.
- `href` navigates directly; `path` emits events for app-level routing.
