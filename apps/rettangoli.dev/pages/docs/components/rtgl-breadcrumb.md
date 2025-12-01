---
template: documentation
title: Breadcrumb
tags: documentation
sidebarId: rtgl-breadcrumb
---

A navigation component that displays the current page's location within a hierarchical structure.

## Properties

| Name | Property | Type | Default |
|-----------|------|---------|---------|
| Items | `items` | Array<{label: string, id?: string}> | `[]` |
| Separator | `separator` | string | `breadcrumb-arrow` |

## Events

| Name | Event | Detail |
|-----------|------|---------|
| Item Click | `item-click` | `{ id: string }` |

## Basic Usage

Display a simple breadcrumb trail showing the navigation path. Items with an `id` property are clickable.

```html codePreview
<rtgl-breadcrumb id="breadcrumb-basic">
</rtgl-breadcrumb>

<script>
  const breadcrumb = document.getElementById('breadcrumb-basic');
  breadcrumb.items = [
    { label: "Actions", id: "breadcrumb-actions" },
    { label: "BGM", id: "breadcrumb-bgm" },
    { label: "Audio Selection" }
  ];
  breadcrumb.render();
</script>
```

## Custom Separator

Customize the separator icon between breadcrumb items using any available SVG icon.

```html codePreview
<rtgl-breadcrumb id="breadcrumb-separator">
</rtgl-breadcrumb>

<script>
  const breadcrumb = document.getElementById('breadcrumb-separator');
  breadcrumb.items = [
    { label: "Home", id: "breadcrumb-home" },
    { label: "Category", id: "breadcrumb-category" },
    { label: "Subcategory", id: "breadcrumb-subcategory" },
    { label: "Current Page" }
  ];
  breadcrumb.separator = "threeDots";
  breadcrumb.render();
</script>
```

## Long Path

Handle longer navigation paths gracefully with multiple levels of hierarchy.

```html codePreview
<rtgl-breadcrumb id="breadcrumb-long">
</rtgl-breadcrumb>

<script>
  const breadcrumb = document.getElementById('breadcrumb-long');
  breadcrumb.items = [
    { label: "Dashboard", id: "breadcrumb-dashboard" },
    { label: "Projects", id: "breadcrumb-projects" },
    { label: "Web Development", id: "breadcrumb-web-dev" },
    { label: "React Components", id: "breadcrumb-react" },
    { label: "UI Library", id: "breadcrumb-ui-lib" },
    { label: "Breadcrumb Component" }
  ];
  breadcrumb.render();
</script>
```

## Single Item

Display a breadcrumb with only one item, useful for top-level pages.

```html codePreview
<rtgl-breadcrumb id="breadcrumb-single">
</rtgl-breadcrumb>

<script>
  const breadcrumb = document.getElementById('breadcrumb-single');
  breadcrumb.items = [
    { label: "Home" }
  ];
  breadcrumb.render();
</script>
```

## Click Events

Handle navigation by listening to the `item-click` event. Only items with an `id` property will trigger click events.

```html codePreview
<rtgl-breadcrumb id="breadcrumb-click">
</rtgl-breadcrumb>

<script>
  const breadcrumb = document.getElementById('breadcrumb-click');
  breadcrumb.items = [
    { label: "Actions", id: "breadcrumb-actions" },
    { label: "BGM", id: "breadcrumb-bgm" },
    { label: "Audio Selection" }
  ];

  breadcrumb.addEventListener('item-click', (event) => {
    console.log('Breadcrumb item clicked:', event.detail);
  });

  breadcrumb.render();
</script>
```
