---
template: documentation
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
| Items | `items` (property) | `{ label: string, id: string, testId?: string }[]` | `[]` |
| Selected Tab | `selected-tab` / `selectedTab` | string | - |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `item-click` | `{ id: string }` | Fires when a tab is clicked |

## Behavior

### Behavior & precedence

- `selected-tab` controls active visual state.
- Component emits selection intent; parent/app updates selected tab.
