---
template: documentation
title: Select
tags: documentation
sidebarId: rtgl-select
---

A controlled option-picker component for single-choice selection.

## Quickstart

Use `options` as data source and listen to `value-change`.

```html codePreview
<rtgl-view d="v" g="sm" w="320">
  <rtgl-text c="mu">Fruit</rtgl-text>
  <rtgl-select id="fruit-select" placeholder="Choose fruit" w="f"></rtgl-select>
</rtgl-view>

<script>
  const select = document.getElementById("fruit-select");

  select.options = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "orange", label: "Orange" },
  ];

  select.addEventListener("value-change", (e) => {
    console.log(e.detail.value);
  });

  select.render();
</script>
```

## Core Decisions

### Choose Data Binding Style

| Intent | Recommended |
| --- | --- |
| Define options list | set `options` as a property |
| Control selected item initially | set `selectedValue` property |
| Placeholder text | `placeholder` attribute or property |

### Choose Clear Behavior

| Intent | Recommended |
| --- | --- |
| Allow clear icon | default |
| Lock selection until another option is chosen | `no-clear` |

### Choose Add-Option UX

| Intent | Recommended |
| --- | --- |
| Standard select menu | omit `addOption` |
| Add action row at bottom | set `addOption` property |

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Placeholder | `placeholder` | string | `Select an option` |
| Selected Value | `selected-value` / `selectedValue` | any | - |
| Options | `options` (property) | `{ label: string, value: any, testId?: string }[]` | `[]` |
| No Clear | `no-clear` | boolean | off |
| Add Option | `addOption` (property) | `{ label?: string }` | - |
| Trigger Width | `w` | number, `%`, `xs`-`xl`, `f`, CSS length/value | content-based |
| Trigger Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `value-change` | `{ value, label, index, item }` | Fires when selection changes or is cleared |
| `add-option-click` | `{}` | Fires when add-option row is clicked |

## Options

Define selectable entries through the `options` property.

### Behavior & precedence

- Each option should include `label` and `value`.
- `value` can be primitive or object.
- `testId` is optional and useful for testing.

```html codePreview
<rtgl-select id="position-select" placeholder="Select position"></rtgl-select>

<script>
  const select = document.getElementById("position-select");
  select.options = [
    { value: { x: 0, y: 0 }, label: "Top Left" },
    { value: { x: 0.5, y: 0.5 }, label: "Center" },
    { value: { x: 1, y: 1 }, label: "Bottom Right" },
  ];
  select.render();
</script>
```

## Selected Value

Set initial/current selection via `selectedValue` or `selected-value`.

### Behavior & precedence

- If `selectedValue` matches an option, that label is shown.
- If it does not match, placeholder label is shown.
- Clearing emits `value-change` with `value: undefined`.

```html codePreview
<rtgl-select id="status-select" selected-value="active"></rtgl-select>

<script>
  const select = document.getElementById("status-select");
  select.options = [
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
  ];
  select.render();
</script>
```

## No Clear

Use `no-clear` when clear affordance must be hidden.

```html codePreview
<rtgl-view d="v" g="md" w="320">
  <rtgl-select id="clear-on"></rtgl-select>
  <rtgl-select id="clear-off" no-clear></rtgl-select>
</rtgl-view>

<script>
  const options = [
    { value: "1", label: "Option 1" },
    { value: "2", label: "Option 2" },
  ];

  const clearOn = document.getElementById("clear-on");
  clearOn.selectedValue = "2";
  clearOn.options = options;
  clearOn.render();

  const clearOff = document.getElementById("clear-off");
  clearOff.selectedValue = "2";
  clearOff.options = options;
  clearOff.render();
</script>
```

## Add Option

Use `addOption` to render an extra action row at the bottom of the menu.

### Behavior & precedence

- `addOption = {}` shows a default add row.
- `addOption = { label: "..." }` customizes add row label.
- Clicking that row emits `add-option-click`.

```html codePreview
<rtgl-select id="tag-select" placeholder="Select or add tag"></rtgl-select>

<script>
  const select = document.getElementById("tag-select");
  select.options = [
    { value: "bug", label: "Bug" },
    { value: "feature", label: "Feature" },
  ];
  select.addOption = { label: "Add new tag" };
  select.addEventListener("add-option-click", () => {
    console.log("Add option clicked");
  });
  select.render();
</script>
```

## Events Example

```html
<rtgl-select id="country-select" placeholder="Country"></rtgl-select>
<script>
  const select = document.getElementById("country-select");
  select.options = [
    { value: "us", label: "United States" },
    { value: "ca", label: "Canada" },
  ];

  select.addEventListener("value-change", (e) => {
    console.log("value-change", e.detail);
  });

  select.addEventListener("add-option-click", () => {
    console.log("add-option-click");
  });

  select.render();
</script>
```
