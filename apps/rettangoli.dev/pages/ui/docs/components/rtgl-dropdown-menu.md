---
template: docs
_bind:
  docs: docs
title: Dropdown Menu
tags: documentation
sidebarId: rtgl-dropdown-menu
---

A contextual floating menu for labels, actions, and separators.

## Quickstart

```html codePreview
<rtgl-button id="open-menu">Open Menu</rtgl-button>
<rtgl-dropdown-menu id="menu"></rtgl-dropdown-menu>

<script>
  const menu = document.getElementById("menu");

  menu.addEventListener("close", () => {
    menu.removeAttribute("open");
  });

  menu.addEventListener("item-click", (e) => {
    console.log("item-click", e.detail);
  });

  document.getElementById("open-menu").addEventListener("click", (e) => {
    menu.items = [
      { label: "Section", type: "section" },
      { id: "settings", label: "Settings", path: "/settings" },
      { id: "profile", label: "Profile", href: "/profile" },
      { type: "separator" },
      { id: "signout", label: "Sign out" },
    ];

    menu.setAttribute("x", String(e.clientX));
    menu.setAttribute("y", String(e.clientY));
    menu.setAttribute("place", "bs");
    menu.setAttribute("open", "");
  });
</script>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Open | `open` | boolean | off |
| Position X | `x` | number | `0` |
| Position Y | `y` | number | `0` |
| Place | `place` | popover place token (`t`, `ts`, `te`, `r`, `rs`, `re`, `b`, `bs`, `be`, `l`, `ls`, `le`) | `bs` |
| Width | `w` | number, `%`, `f`, CSS length/value | `300` |
| Height | `h` | number, `%`, `f`, CSS length/value | `300` |
| Items | `items` (property) | `DropdownItem[]` | `[]` |

## Dropdown Item

| Field | Type | Notes |
| --- | --- | --- |
| `label` | string | required for `section` and `item` rows |
| `type` | `section` \| `item` \| `separator` | defaults to `item`; legacy `label` is still accepted as an alias for `section` |
| `id` | string | optional identity |
| `icon` | string | optional leading icon for `item` rows |
| `path` | string | app/router navigation intent |
| `href` | string | native link navigation |
| `shortcut` | string | right-side trailing text for `item` rows; takes precedence over `suffixText` |
| `suffixText` | string | right-side trailing text when `shortcut` is not provided |
| `disabled` | boolean | disabled item, not interactive |
| `newTab` | boolean | opens `href` in a new tab |
| `rel` | string | link rel (for `href`) |
| `testId` | string | optional testing id |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `close` | `{}` | Fires when overlay close is requested |
| `item-click` | `{ index, item, id, path, href, trigger }` | Fires when an interactive `item` row is clicked |

## Behavior

### Behavior & precedence

- `type="section"` and `type="separator"` are non-interactive.
- `type="item"` is interactive unless `disabled` is true.
- Legacy `type="label"` is still accepted and behaves like `type="section"`.
- Interaction precedence is `href` > `path` > event-only item.
- `id` is identity only and does not control clickability.
- If `newTab` is true and `rel` is omitted, `rel="noopener noreferrer"` is applied.

```html codePreview
<rtgl-dropdown-menu id="menu2" open x="24" y="24"></rtgl-dropdown-menu>

<script>
  const menu2 = document.getElementById("menu2");

  menu2.items = [
    { label: "Navigation", type: "section" },
    { id: "docs", label: "Docs", href: "/docs", newTab: true, rel: "noopener" },
    { id: "settings", label: "Settings", path: "/settings" },
    { id: "danger", label: "Delete", disabled: true },
    { type: "separator" },
    { id: "raw-action", label: "Custom action" },
  ];

  menu2.addEventListener("item-click", (e) => {
    if (e.detail.path) {
      console.log("route to", e.detail.path);
    }
  });

  menu2.render();
</script>
```
