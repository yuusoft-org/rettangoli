---
template: base
_bind:
  docs: docs
title: Tooltip
tags: documentation
sidebarId: rtgl-tooltip
---

A lightweight floating hint component for short contextual help.

## Quickstart

```html codePreview
<rtgl-button id="help-btn">Show Tooltip</rtgl-button>
<rtgl-tooltip id="tooltip" content="Helpful context" place="t"></rtgl-tooltip>

<script>
  const button = document.getElementById("help-btn");
  const tooltip = document.getElementById("tooltip");

  button.addEventListener("click", () => {
    const rect = button.getBoundingClientRect();
    if (tooltip.hasAttribute("open")) {
      tooltip.removeAttribute("open");
      return;
    }
    tooltip.setAttribute("x", String(rect.left + rect.width / 2));
    tooltip.setAttribute("y", String(rect.top - 2));
    tooltip.setAttribute("open", "");
  });
</script>
```

## API

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Open | `open` | boolean | - |
| Position X | `x` | number | `0` |
| Position Y | `y` | number | `0` |
| Place | `place` | popover place token (`t`, `ts`, `te`, `r`, `rs`, `re`, `b`, `bs`, `be`, `l`, `ls`, `le`) | `t` |
| Content | `content` | string | `""` |

## Behavior

### Behavior & precedence

- Controlled by `open`.
- Uses explicit `x`/`y` positioning.
- `place` controls orientation relative to anchor point.
