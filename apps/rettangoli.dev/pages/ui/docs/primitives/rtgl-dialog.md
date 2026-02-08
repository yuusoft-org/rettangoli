---
template: documentation
title: Dialog
tags: documentation
sidebarId: rtgl-dialog
---

A controlled modal primitive for focused workflows and confirmations.

## Quickstart

Use `open` as the source of truth and close by removing `open`.

```html codePreview
<rtgl-button id="open-basic">Open Dialog</rtgl-button>
<rtgl-dialog id="dialog-basic" s="md">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Dialog Title</rtgl-text>
    <rtgl-text c="mu">Dialog content goes here.</rtgl-text>
    <rtgl-view d="h" g="sm" ah="e">
      <rtgl-button v="ol" id="close-basic">Cancel</rtgl-button>
      <rtgl-button v="pr">Confirm</rtgl-button>
    </rtgl-view>
  </rtgl-view>
</rtgl-dialog>

<script>
  const dialog = document.getElementById("dialog-basic");
  document.getElementById("open-basic").addEventListener("click", () => {
    dialog.setAttribute("open", "");
  });
  document.getElementById("close-basic").addEventListener("click", () => {
    dialog.removeAttribute("open");
  });
  dialog.addEventListener("close", () => {
    dialog.removeAttribute("open");
  });
</script>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Open | `open` | boolean | - |
| Size | `s` | `sm`, `md`, `lg`, `f` | content-based |
| Width Override | `w` | CSS width value (`600px`, `70vw`, etc.) | - |

## Events

| Event | Description |
| --- | --- |
| `close` | Close request event. Emitted on overlay/escape close intent. |

## Open State

`rtgl-dialog` is controlled by the `open` attribute.

### Behavior & precedence

- Add `open` to show.
- Remove `open` to hide.
- `close` event is a close request; dialog visibility still follows `open`.

```html codePreview
<rtgl-button id="open-state">Open</rtgl-button>
<rtgl-dialog id="dialog-state">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text>Controlled dialog</rtgl-text>
    <rtgl-button v="ol" id="close-state">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  const dialog = document.getElementById("dialog-state");
  document.getElementById("open-state").addEventListener("click", () => {
    dialog.setAttribute("open", "");
  });
  document.getElementById("close-state").addEventListener("click", () => {
    dialog.removeAttribute("open");
  });
  dialog.addEventListener("close", () => {
    dialog.removeAttribute("open");
  });
</script>
```

## Size

Use `s` to choose a standard dialog width profile.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-dialog s="sm" open>
    <rtgl-view slot="content"><rtgl-text>Small</rtgl-text></rtgl-view>
  </rtgl-dialog>
  <rtgl-dialog s="md" open>
    <rtgl-view slot="content"><rtgl-text>Medium</rtgl-text></rtgl-view>
  </rtgl-dialog>
  <rtgl-dialog s="lg" open>
    <rtgl-view slot="content"><rtgl-text>Large</rtgl-text></rtgl-view>
  </rtgl-dialog>
</rtgl-view>
```

## Width Override

Use `w` when you need explicit width control.

### Behavior & precedence

- `w` applies an explicit width override.
- `s` applies size presets.
- If both are set, treat `w` as the explicit override you are opting into.

```html codePreview
<rtgl-dialog open w="640px">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Custom Width</rtgl-text>
    <rtgl-text c="mu">This dialog uses explicit width.</rtgl-text>
  </rtgl-view>
</rtgl-dialog>
```

## Content Slot

Render dialog body via `slot="content"`.

```html codePreview
<rtgl-dialog open>
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Slotted Content</rtgl-text>
    <rtgl-text c="mu">Any Rettangoli layout/content can be used here.</rtgl-text>
  </rtgl-view>
</rtgl-dialog>
```
