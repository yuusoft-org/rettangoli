---
template: docs
_bind:
  docs: docs
title: Tabs
tags: documentation
sidebarId: rtgl-tabs
---

A segmented tab switcher for single active section selection.

## Quickstart

```html codePreview
<rtgl-tabs id="tabs" selected-tab="tab1"></rtgl-tabs>

<script>
  const tabs = document.getElementById("tabs");
  tabs.items = [
    { label: "Overview", id: "tab1" },
    { label: "Metrics", id: "tab2" },
    { label: "Settings", id: "tab3" },
  ];

  tabs.addEventListener("item-click", (e) => {
    tabs.setAttribute("selected-tab", e.detail.id);
  });

  tabs.render();
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Size | `s` | `sm`, `md`, `lg` | `md` |
| Items | `items` (property) | `{ label: string, id: string, testId?: string }[]` | `[]` |
| Selected Tab | `selected-tab` / `selectedTab` | string | - |

## Sizes

`s` controls tab height, padding, and the gap between items. All sizes use the
same theme typography. With the default theme tokens:

| Size | Tray height | Horizontal padding per tab |
| --- | --- | --- |
| `sm` | 34px | 10px per side |
| `md` | 38px | 13px per side |
| `lg` | 44px | 16px per side |

The tray fits its contents, and each tab fits its own label. A short label such
as `A` stays narrower than `Settings`, even inside a full-width parent.

```html codePreview
<rtgl-view g="lg">
  <rtgl-tabs id="tabs-sm" s="sm" selected-tab="a"></rtgl-tabs>
  <rtgl-tabs id="tabs-md" s="md" selected-tab="a"></rtgl-tabs>
  <rtgl-tabs id="tabs-lg" s="lg" selected-tab="a"></rtgl-tabs>
</rtgl-view>

<script>
  for (const size of ["sm", "md", "lg"]) {
    const tabs = document.getElementById(`tabs-${size}`);
    tabs.items = [
      { label: "A", id: "a" },
      { label: "Metrics", id: "metrics" },
      { label: "Settings", id: "settings" },
    ];
    tabs.addEventListener("item-click", (event) => {
      tabs.setAttribute("selected-tab", event.detail.id);
    });
    tabs.render();
  }
</script>
```

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `item-click` | `{ id: string }` | Fires when a tab is clicked |

## Behavior

### Behavior & precedence

- `selected-tab` controls active visual state.
- Component emits selection intent; parent/app updates selected tab.
- `s` can be changed after mount. Omitted or unsupported sizes use `md`.
- Changing size preserves `selected-tab` and does not emit `item-click`.
