---
template: docs
_bind:
  docs: docs
title: Page Outline
tags: documentation
sidebarId: rtgl-page-outline
---

An auto-generated in-page outline based on headings inside a target content container.

## Quickstart

```html codePreview
<rtgl-view d="h" h="100vh" w="f">
  <rtgl-view id="content" w="1fg" sv>
    <h1 id="intro">Introduction</h1>
    <rtgl-text>Overview content</rtgl-text>
    <h2 id="setup">Setup</h2>
    <rtgl-text>Setup details</rtgl-text>
  </rtgl-view>

  <rtgl-page-outline
    target-id="content"
    scroll-container-id="content"
    offset-top="80"
  ></rtgl-page-outline>
</rtgl-view>
```

## API

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Target Container | `target-id` | element id | required |
| Scroll Container | `scroll-container-id` | element id or `window` fallback | `window` |
| Active Offset | `offset-top` | number (px) | `100` |

## Behavior

### Behavior & precedence

- Indexes `h1`-`h4` and `rtgl-text[id]` in target container.
- Active item updates from scroll position and `offset-top`.
- If no `scroll-container-id` is set, window scroll is used.
- Clicking outline items navigates via anchors.
