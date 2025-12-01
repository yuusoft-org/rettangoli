---
template: documentation
title: Sidebar
tags: documentation
sidebarId: rtgl-sidebar
---

A vertical navigation component that displays a list of items with optional header and icons.

## Properties

| Name | Property | Type | Default |
|-----------|------|---------|---------|
| Header | `header` | {label: string, image?: {src: string, width: number, height: number, alt: string}} | - |
| Items | `items` | Array<{id?: string, title: string, icon?: string, type?: string, items?: Array}> | `[]` |
| Selected Item ID | `selectedItemId` | string | - |

## Attributes

| Name | Attribute | Type | Default |
|-----------|------|---------|---------|
| Mode | `mode` | string | - |

## Events

| Name | Event | Detail |
|-----------|------|---------|
| Item Click | `item-click` | `{ id: string }` |

## Basic Usage

Display a simple sidebar with a header and navigation items.

```html codePreview
<rtgl-view g="lg" h="400" w="f" fw="w">
  <rtgl-sidebar id="sidebar-basic"></rtgl-sidebar>
</rtgl-view>

<script>
  const sidebar = document.getElementById('sidebar-basic');
  sidebar.selectedItemId = "about";
  sidebar.header = {
    label: "Sidebar",
    image: {
      src: "/public/sample1.jpg",
      width: 32,
      height: 32,
      alt: "Sidebar",
    },
  }
  sidebar.items = [
    {
      id: "home",
      title: "Home",
    },
    {
      id: "about",
      title: "About",
    },
    {
      id: "contact",
      title: "Contact",
    },
  ]
  sidebar.render();
</script>
```

## With Icons

Add icons to sidebar items for better visual identification.

```html codePreview
<rtgl-view g="lg" h="400" w="f" fw="w">
  <rtgl-sidebar id="sidebar-icons"></rtgl-sidebar>
</rtgl-view>

<script>
  const sidebar = document.getElementById('sidebar-icons');
  sidebar.header = {
    label: "Navigation",
    image: {
      src: "/public/sample1.jpg",
      width: 32,
      height: 32,
      alt: "Navigation",
    },
  }
  sidebar.items = [
    {
      id: "home",
      title: "Home",
      icon: "home"
    },
    {
      id: "music",
      title: "Music Library",
      icon: "music"
    },
    {
      id: "playlists",
      title: "Playlists",
      icon: "play"
    },
    {
      type: "groupLabel",
      title: "Settings"
    },
    {
      id: "preferences",
      title: "Preferences",
      icon: "text"
    },
    {
      id: "more",
      title: "More Options",
      icon: "threeDots"
    },
  ]
  sidebar.render();
</script>
```

## With Item Groups

Organize sidebar items into labeled groups.

```html codePreview
<rtgl-view g="lg" h="400" w="f" fw="w">
  <rtgl-sidebar id="sidebar-groups"></rtgl-sidebar>
</rtgl-view>

<script>
  const sidebar = document.getElementById('sidebar-groups');

  sidebar.header = {
    label: "Sidebar",
    image: {
      src: "/public/sample1.jpg",
      width: 32,
      height: 32,
      alt: "Sidebar",
    },
  }

  sidebar.items = [
    {
      title: "Group 1",
      type: 'groupLabel',
      items: [{
        id: "item-1",
        title: "Item 1",
      }, {
        id: "item-2",
        title: "Item 2",
      }]
    },
    {
      title: "Group 2",
      type: 'groupLabel',
      items: [{
        id: "item-3",
        title: "Item 3",
      }, {
        id: "item-4",
        title: "Item 4",
      }]
    },
    {
      title: "Group 3",
      type: 'groupLabel',
      items: [{
        id: "item-5",
        title: "Item 5",
      }]
    },
  ]
  sidebar.render();
</script>
```

## Shrunk Mode

Use shrunk mode to display a compact sidebar with icons only.

```html codePreview
<rtgl-view g="lg" h="400" w="f" fw="w">
  <rtgl-sidebar id="sidebar-shrunk" mode="shrunk"></rtgl-sidebar>
</rtgl-view>

<script>
  const sidebar = document.getElementById('sidebar-shrunk');
  sidebar.header = {
    label: "Navigation",
    image: {
      src: "/public/sample1.jpg",
      width: 32,
      height: 32,
      alt: "Logo",
    },
  };
  sidebar.items = [
    { id: "home", title: "Home", icon: "home" },
    { id: "search", title: "Search", icon: "search" },
    { id: "music", title: "Music", icon: "music" },
    { id: "settings", title: "Settings", icon: "gear" },
  ];
  sidebar.render();
</script>
```
