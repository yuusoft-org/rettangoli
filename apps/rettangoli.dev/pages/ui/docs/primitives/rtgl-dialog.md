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
| Layout | `layout`, `sm-layout`, `md-layout`, `lg-layout`, `xl-layout` | `centered`, `fixed` | `centered` |
| No Padding | `no-padding` | boolean | - |
| Bare | `bare` | boolean | - |
| Close Button | `close-button` | boolean | - |

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
- `Tab` and `Shift+Tab` wrap through focusable slotted content, including controls inside open shadow roots, without moving focus back to the page.

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

Use `s` to choose a standard dialog width profile. On `md` and smaller viewports, `sm`, `md`, and `lg` dialogs automatically expand near full viewport width.

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

## Close Button

Add `close-button` when the dialog should render a built-in top-right X icon button. The button is absolutely positioned over the dialog surface and does not reserve or change content padding. It emits the same `close` request event as backdrop and escape close intent.

```html codePreview
<rtgl-button id="open-close-button">Open With Close Button</rtgl-button>
<rtgl-dialog id="dialog-close-button" s="md" close-button>
  <rtgl-view slot="content" d="v" g="md">
    <rtgl-text s="h4">Closable Dialog</rtgl-text>
    <rtgl-text c="mu">The top-right control requests close without owning state.</rtgl-text>
  </rtgl-view>
</rtgl-dialog>

<script>
  (() => {
    const dialogCloseButton = document.getElementById("dialog-close-button");
    document.getElementById("open-close-button").addEventListener("click", () => {
      dialogCloseButton.setAttribute("open", "");
    });
    dialogCloseButton.addEventListener("close", () => {
      dialogCloseButton.removeAttribute("open");
    });
  })();
</script>
```

## Fixed Footer Pattern

For mobile fixed dialogs with a bottom submit action, make the slotted content a relative, clipped shell. Put the scrollable body inside that shell, then anchor the footer with `pos="abs"` and `edge="b"`.

```html codePreview
<rtgl-button id="open-fixed-submit">Open Fixed Submit Dialog</rtgl-button>
<rtgl-dialog id="dialog-fixed-submit" s="lg" md-layout="fixed" close-button>
  <rtgl-view
    slot="content"
    pos="rel"
    h="f"
    overflow="hidden"
    style="padding-bottom: 88px;"
  >
    <rtgl-view id="fixed-submit-body" d="v" g="md" h="f" sv>
      <rtgl-text s="h4">Review Details</rtgl-text>
      <rtgl-text c="mu">Only this body scrolls while the bottom action stays pinned.</rtgl-text>
      <rtgl-view d="v" g="sm">
        <rtgl-text>Billing contact</rtgl-text>
        <rtgl-text>Plan configuration</rtgl-text>
        <rtgl-text>Usage limits</rtgl-text>
        <rtgl-text>Invoice notes</rtgl-text>
        <rtgl-text>Team permissions</rtgl-text>
        <rtgl-text>Notification rules</rtgl-text>
      </rtgl-view>
    </rtgl-view>
    <rtgl-view pos="abs" edge="b" bgc="bg" bc="bo" bwt="xs" p="lg">
      <rtgl-button w="f">Submit</rtgl-button>
    </rtgl-view>
  </rtgl-view>
</rtgl-dialog>

<script>
  (() => {
    const dialogFixedSubmit = document.getElementById("dialog-fixed-submit");
    document.getElementById("open-fixed-submit").addEventListener("click", () => {
      dialogFixedSubmit.setAttribute("open", "");
    });
    dialogFixedSubmit.addEventListener("close", () => {
      dialogFixedSubmit.removeAttribute("open");
    });
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

## Responsive Layout

Use `layout` and breakpoint-prefixed layout attrs to change dialog layout responsively. `centered` is the default adaptive centered dialog. `fixed` locks the dialog shell to the viewport and scrolls the content surface internally.

Add `no-padding` when the slotted content should own all spacing. It removes dialog-owned padding and left/right content margins. This is useful for fixed mobile dialogs that render a full-height shell, custom safe-area handling, or pinned internal footers.

```html codePreview
<rtgl-button id="open-fixed-mobile">Open Fixed Mobile Dialog</rtgl-button>
<rtgl-dialog id="dialog-fixed-mobile" s="lg" md-layout="fixed" no-padding>
  <rtgl-view slot="content" d="v" g="md" p="lg" wh="f">
    <rtgl-text s="h4">Fixed on Mobile</rtgl-text>
    <rtgl-text c="mu">On md and smaller screens, the dialog fills the viewport and this content scrolls internally.</rtgl-text>
    <rtgl-button v="ol" id="close-fixed-mobile">Close</rtgl-button>
  </rtgl-view>
</rtgl-dialog>

<script>
  (() => {
    const dialogFixedMobile = document.getElementById("dialog-fixed-mobile");
    document.getElementById("open-fixed-mobile").addEventListener("click", () => {
      dialogFixedMobile.setAttribute("open", "");
    });
    document.getElementById("close-fixed-mobile").addEventListener("click", () => {
      dialogFixedMobile.removeAttribute("open");
    });
    dialogFixedMobile.addEventListener("close", () => {
      dialogFixedMobile.removeAttribute("open");
    });
  })();
</script>
```

## Bare Modal Shell

Add `bare` when the slotted content should own the complete visual surface. It keeps the native modal behavior, including focus containment, document inertness, and escape close requests, while making the backdrop and content slot transparent and removing dialog-owned padding, borders, radius, horizontal margins, and content animation.

Combine `bare` with `layout="fixed"` for custom viewport-level layouts such as side panels. The consumer remains responsible for rendering its own dismiss target, backdrop treatment, surface, and internal scrolling.

```html codePreview
<rtgl-button id="open-bare-shell">Open Bare Shell</rtgl-button>
<rtgl-dialog id="dialog-bare-shell" layout="fixed" bare>
  <rtgl-view slot="content" pos="rel" wh="f">
    <rtgl-view pos="abs" edge="f" style="background: rgba(0, 0, 0, 0.12);"></rtgl-view>
    <rtgl-view
      pos="abs"
      bgc="bg"
      p="lg"
      style="left: 32px; top: 32px; bottom: 32px; width: min(420px, calc(100vw - 64px)); box-sizing: border-box;"
    >
      <rtgl-view d="v" g="md">
        <rtgl-text s="h4">Consumer-owned modal surface</rtgl-text>
        <rtgl-text c="mu">The native dialog owns modality while this slotted content owns every visual layer.</rtgl-text>
        <rtgl-button v="ol" id="close-bare-shell">Close</rtgl-button>
      </rtgl-view>
    </rtgl-view>
  </rtgl-view>
</rtgl-dialog>

<script>
  (() => {
    const dialogBareShell = document.getElementById("dialog-bare-shell");
    document.getElementById("open-bare-shell").addEventListener("click", () => {
      dialogBareShell.setAttribute("open", "");
    });
    document.getElementById("close-bare-shell").addEventListener("click", () => {
      dialogBareShell.removeAttribute("open");
    });
    dialogBareShell.addEventListener("close", () => {
      dialogBareShell.removeAttribute("open");
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
