---
template: base
_bind:
  docs: docs
title: Accordion Item
tags: documentation
sidebarId: rtgl-accordion-item
---

A collapsible section component for toggled content blocks.

## Quickstart

```html codePreview
<rtgl-view w="420">
  <rtgl-accordion-item
    label="What is Rettangoli?"
    content="Rettangoli is a UI component library built with web components."
  ></rtgl-accordion-item>
</rtgl-view>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Label | `label` | string | `""` |
| Content | `content` | string | `""` |
| Width | `w` | number, `%`, `f`, CSS length/value | content-based |
| Slot Content | `slot="content"` | any content | - |

## Behavior

### Behavior & precedence

- Clicking header toggles open/closed state.
- `content` is the inline text body.
- `slot="content"` is rendered below `content` and is useful for richer layouts.

```html codePreview
<rtgl-view w="420">
  <rtgl-accordion-item label="Advanced" content="Inline summary">
    <rtgl-view slot="content" g="sm">
      <rtgl-text c="mu-fg">Slotted content area</rtgl-text>
      <rtgl-button v="ol">Action</rtgl-button>
    </rtgl-view>
  </rtgl-accordion-item>
</rtgl-view>
```
