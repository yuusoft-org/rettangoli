---
template: base
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
    { id: "home", title: "Home", icon: "home" },
    { id: "about", title: "About", icon: "info" },
    { type: "groupLabel", title: "Admin" },
    { id: "settings", title: "Settings", icon: "settings" },
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
| Header | `header` (property) | object | `{}` |
| Items | `items` (property) | array | `[]` |

### Header Shape
- `label`, `href`, `path`, `testId`
- `image: { src, width, height, alt, href?, path? }`

### Item Shape
- `id`, `title`, `icon`, `href`, `path`, `type`, `testId`
- `type: "groupLabel"` for section labels
- `items: [...]` for nested item flattening

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
- `href` navigates directly; `path` emits events for app-level routing.
