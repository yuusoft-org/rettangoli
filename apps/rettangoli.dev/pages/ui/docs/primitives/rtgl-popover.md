---
template: documentation
title: Popover
tags: documentation
sidebarId: rtgl-popover
---

A controlled floating-surface primitive for contextual actions and small overlays.

## Quickstart

Use `open` as the source of truth, and set `x`/`y` from the trigger event.

```html codePreview
<rtgl-button id="open-popover">Open Popover</rtgl-button>
<rtgl-popover id="popover" place="bs">
  <rtgl-view slot="content" d="v" g="sm">
    <rtgl-text s="h5">Popover</rtgl-text>
    <rtgl-text c="mu">Contextual content goes here.</rtgl-text>
    <rtgl-button v="ol" id="close-popover">Close</rtgl-button>
  </rtgl-view>
</rtgl-popover>

<script>
  const popover = document.getElementById("popover");
  document.getElementById("open-popover").addEventListener("click", (e) => {
    popover.setAttribute("open", "");
    popover.setAttribute("x", String(e.clientX));
    popover.setAttribute("y", String(e.clientY));
  });

  document.getElementById("close-popover").addEventListener("click", () => {
    popover.removeAttribute("open");
  });

  popover.addEventListener("close", () => {
    popover.removeAttribute("open");
  });
</script>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Open | `open` | boolean | - |
| Position X | `x` | number (viewport px) | `0` |
| Position Y | `y` | number (viewport px) | `0` |
| Place | `place` | `t`, `ts`, `te`, `r`, `rs`, `re`, `b`, `bs`, `be`, `l`, `ls`, `le` | `bs` |
| No Overlay | `no-overlay` | boolean | - |

## Events

| Event | Description |
| --- | --- |
| `close` | Close request event on Escape, and on overlay/backdrop close intent when overlay mode is enabled. |

## Open State

`rtgl-popover` is controlled by the `open` attribute.

### Behavior & precedence

- Add `open` to show.
- Remove `open` to hide.
- `close` is a close request; visibility still follows `open`.
- Overlay/backdrop close intent applies in default overlay mode.

```html codePreview
<rtgl-popover open x="120" y="120">
  <rtgl-view slot="content">
    <rtgl-text>Open popover</rtgl-text>
  </rtgl-view>
</rtgl-popover>
```

## Position

Use `x` and `y` to anchor the popover at viewport coordinates.

### Behavior & precedence

- `x` and `y` are read as numbers.
- Omitted coordinates resolve to `0`.
- Position updates when `x`, `y`, or `place` changes while open.

```html codePreview
<rtgl-button id="at-cursor">Open At Cursor</rtgl-button>
<rtgl-popover id="cursor-popover">
  <rtgl-view slot="content">
    <rtgl-text>Anchored to click position</rtgl-text>
  </rtgl-view>
</rtgl-popover>

<script>
  const pop = document.getElementById("cursor-popover");
  document.getElementById("at-cursor").addEventListener("click", (e) => {
    pop.setAttribute("x", String(e.clientX));
    pop.setAttribute("y", String(e.clientY));
    pop.setAttribute("open", "");
  });
</script>
```

## Place

Choose where the surface appears relative to the `x`/`y` anchor.

- `t`, `ts`, `te`
- `r`, `rs`, `re`
- `b`, `bs`, `be`
- `l`, `ls`, `le`

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-popover open x="120" y="120" place="t">
    <rtgl-view slot="content"><rtgl-text>Top</rtgl-text></rtgl-view>
  </rtgl-popover>
  <rtgl-popover open x="260" y="120" place="rs">
    <rtgl-view slot="content"><rtgl-text>Right Start</rtgl-text></rtgl-view>
  </rtgl-popover>
</rtgl-view>
```

## No Overlay

Use `no-overlay` for non-modal floating surfaces.

### Behavior & precedence

- `no-overlay` removes modal backdrop behavior.
- Outside-click close is not automatic in this mode.
- Keep close behavior controlled by your own logic and `open` updates.

```html codePreview
<rtgl-popover open no-overlay x="160" y="180">
  <rtgl-view slot="content">
    <rtgl-text>Overlay disabled</rtgl-text>
  </rtgl-view>
</rtgl-popover>
```

## Content Slot

Render popover body via `slot="content"`.

```html codePreview
<rtgl-popover open x="120" y="140">
  <rtgl-view slot="content" d="v" g="sm">
    <rtgl-text s="h5">Actions</rtgl-text>
    <rtgl-button v="gh">Rename</rtgl-button>
    <rtgl-button v="de">Delete</rtgl-button>
  </rtgl-view>
</rtgl-popover>
```
