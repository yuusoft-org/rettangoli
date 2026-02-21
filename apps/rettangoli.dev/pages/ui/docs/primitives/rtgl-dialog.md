---
template: docs
_bind:
  docs: docs
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
  (() => {
    const dialogBasic = document.getElementById("dialog-basic");
    document.getElementById("open-basic").addEventListener("click", () => {
      dialogBasic.setAttribute("open", "");
    });
    document.getElementById("close-basic").addEventListener("click", () => {
      dialogBasic.removeAttribute("open");
    });
    dialogBasic.addEventListener("close", () => {
      dialogBasic.removeAttribute("open");
    });
  })();
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
  (() => {
    const dialogState = document.getElementById("dialog-state");
    document.getElementById("open-state").addEventListener("click", () => {
      dialogState.setAttribute("open", "");
    });
    document.getElementById("close-state").addEventListener("click", () => {
      dialogState.removeAttribute("open");
    });
    dialogState.addEventListener("close", () => {
      dialogState.removeAttribute("open");
    });
  })();
</script>
```

## Size

Use `s` to choose a standard dialog width profile.

```html codePreview
<rtgl-view d="h" g="sm" wrap>
  <rtgl-button id="open-size-sm">Open Small</rtgl-button>
  <rtgl-button id="open-size-md">Open Medium</rtgl-button>
  <rtgl-button id="open-size-lg">Open Large</rtgl-button>
</rtgl-view>

<rtgl-dialog id="dialog-size-sm" s="sm">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Small</rtgl-text>
    <rtgl-button v="ol" id="close-size-sm">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>
<rtgl-dialog id="dialog-size-md" s="md">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Medium</rtgl-text>
    <rtgl-button v="ol" id="close-size-md">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>
<rtgl-dialog id="dialog-size-lg" s="lg">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Large</rtgl-text>
    <rtgl-button v="ol" id="close-size-lg">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  (() => {
    const sizes = ["sm", "md", "lg"];
    for (const size of sizes) {
      const dialog = document.getElementById(`dialog-size-${size}`);
      document.getElementById(`open-size-${size}`).addEventListener("click", () => {
        dialog.setAttribute("open", "");
      });
      document.getElementById(`close-size-${size}`).addEventListener("click", () => {
        dialog.removeAttribute("open");
      });
      dialog.addEventListener("close", () => {
        dialog.removeAttribute("open");
      });
    }
  })();
</script>
```

## Width Override

Use `w` when you need explicit width control.

### Behavior & precedence

- `w` applies an explicit width override.
- `s` applies size presets.
- If both are set, treat `w` as the explicit override you are opting into.

```html codePreview
<rtgl-button id="open-width">Open Custom Width</rtgl-button>
<rtgl-dialog id="dialog-width" w="640px">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Custom Width</rtgl-text>
    <rtgl-text c="mu">This dialog uses explicit width.</rtgl-text>
    <rtgl-button v="ol" id="close-width">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  (() => {
    const dialogWidth = document.getElementById("dialog-width");
    document.getElementById("open-width").addEventListener("click", () => {
      dialogWidth.setAttribute("open", "");
    });
    document.getElementById("close-width").addEventListener("click", () => {
      dialogWidth.removeAttribute("open");
    });
    dialogWidth.addEventListener("close", () => {
      dialogWidth.removeAttribute("open");
    });
  })();
</script>
```

## Content Slot

Render dialog body via `slot="content"`.

```html codePreview
<rtgl-button id="open-slot">Open Slotted Dialog</rtgl-button>
<rtgl-dialog id="dialog-slot">
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Slotted Content</rtgl-text>
    <rtgl-text c="mu">Any Rettangoli layout/content can be used here.</rtgl-text>
    <rtgl-button v="ol" id="close-slot">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  (() => {
    const dialogSlot = document.getElementById("dialog-slot");
    document.getElementById("open-slot").addEventListener("click", () => {
      dialogSlot.setAttribute("open", "");
    });
    document.getElementById("close-slot").addEventListener("click", () => {
      dialogSlot.removeAttribute("open");
    });
    dialogSlot.addEventListener("close", () => {
      dialogSlot.removeAttribute("open");
    });
  })();
</script>
```
