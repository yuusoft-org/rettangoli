---
template: docs
_bind:
  docs: docs
title: Navbar
tags: documentation
sidebarId: rtgl-navbar
---

A top navigation shell with a configurable start area and right-side slot content.

## Quickstart

```html codePreview
<rtgl-navbar id="navbar">
  <rtgl-view slot="right" d="h" g="md">
    <rtgl-button v="gh">Docs</rtgl-button>
    <rtgl-button v="pr">Sign In</rtgl-button>
  </rtgl-view>
</rtgl-navbar>

<script>
  const navbar = document.getElementById("navbar");
  navbar.start = {
    label: "Rettangoli",
    href: "/",
    image: {
      src: "/public/sample1.jpg",
      width: 32,
      height: 32,
      alt: "Logo",
    },
  };
  navbar.render();
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Start Config | `start` (property) | `{ label?, href?, path?, labelHref?, labelPath?, image? }` | `{}` |
| Right Slot | `slot="right"` | any content | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `start-click` | `{ path }` | Fires when start area is path-driven and clicked |

## Behavior

### Behavior & precedence

- If `start.href` is present, start area renders as link.
- Else if `start.path` is present, start area emits `start-click`.
- Else start area is static content.
