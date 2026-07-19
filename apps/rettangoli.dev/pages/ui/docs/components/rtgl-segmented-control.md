---
template: docs
_bind:
  docs: docs
title: Segmented Control
tags: documentation
sidebarId: rtgl-segmented-control
---

A grouped single-choice control for switching between a small set of text or icon-only options.

## Quickstart

Set `options` as a property and listen to `value-change`.

```html codePreview
<rtgl-segmented-control id="role-control" w="320"></rtgl-segmented-control>

<script>
  const control = document.getElementById("role-control");
  control.options = [
    { value: "admin", label: "Admin" },
    { value: "editor", label: "Editor" },
    { value: "viewer", label: "Viewer" },
  ];
  control.selectedValue = "editor";

  control.addEventListener("value-change", (event) => {
    console.log(event.detail.value);
  });

  control.render();
</script>
```

## API

| Name           | Attribute / Property               | Type                                                                                  | Default             |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------- |
| Options        | `options` (property)               | `{ value: any, label?: string, svg?: string, ariaLabel?: string, testId?: string }[]` | `[]`                |
| Selected Value | `selected-value` / `selectedValue` | any                                                                                   | -                   |
| Group Label    | `placeholder`                      | string                                                                                | `Segmented control` |
| No Clear       | `no-clear`                         | boolean                                                                               | off                 |
| Add Option     | `addOption` (property)             | `{ label?: string }`                                                                  | -                   |
| Disabled       | `disabled`                         | boolean                                                                               | `false`             |
| Size           | `s`                                | `sm`, `md`                                                                            | `md`                |
| Width          | `w`                                | number, `%`, `xs`-`xl`, `f`, CSS length/value                                         | content-based       |

## Events

| Event              | Detail                          | Description                                  |
| ------------------ | ------------------------------- | -------------------------------------------- |
| `value-change`     | `{ value, label, index, item }` | Fires when selection changes or is cleared   |
| `add-option-click` | `{}`                            | Fires when the add-option segment is clicked |

## Sizes

Use `s="sm"` for a compact 24px-high control. It uses smaller text, icons, and horizontal padding. The default `s="md"` control is 32px high.

```html codePreview
<rtgl-view d="h" av="c" g="lg">
  <rtgl-segmented-control id="size-md" w="240"></rtgl-segmented-control>
  <rtgl-segmented-control id="size-sm" s="sm" w="200"></rtgl-segmented-control>
</rtgl-view>

<script>
  for (const id of ["size-md", "size-sm"]) {
    const control = document.getElementById(id);
    control.options = [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" },
    ];
    control.selectedValue = "center";
    control.render();
  }
</script>
```

## Icon-Only Options

Set `svg` to a registered `rtgl-svg` key. When `svg` is present, the segment renders the icon instead of `label` text.

Use `ariaLabel` to give each icon-only segment an accessible name. If `ariaLabel` is omitted, `label` is used as the accessible-name fallback. Neither field creates a visual hover tooltip.

```html codePreview
<rtgl-segmented-control id="mode-control" w="240"></rtgl-segmented-control>

<script>
  const control = document.getElementById("mode-control");
  control.options = [
    { value: "text", svg: "text", ariaLabel: "Text mode" },
    { value: "music", svg: "music", ariaLabel: "Music mode" },
    { value: "play", svg: "play", ariaLabel: "Playback mode" },
  ];
  control.selectedValue = "music";
  control.render();
</script>
```

## Selection Behavior

- `selectedValue` controls the active option.
- Selecting the active option clears it unless `no-clear` is enabled.
- Values may be primitives or objects and are matched by deep equality.
- Disabled controls preserve their selection styling but do not respond to pointer or keyboard input.
