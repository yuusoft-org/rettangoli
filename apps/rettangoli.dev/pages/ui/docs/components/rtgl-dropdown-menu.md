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
    const { index, indexPath, item } = e.detail;
    console.log("item-click", { index, indexPath, item });
  });

  document.getElementById("open-menu").addEventListener("click", (e) => {
    menu.items = [
      { label: "Section", type: "section" },
      { id: "settings", label: "Settings", path: "/settings" },
      { id: "profile", label: "Profile", href: "/profile" },
      {
        id: "export",
        label: "Export",
        items: [
          { id: "export-pdf", label: "PDF" },
          { id: "export-csv", label: "CSV" },
        ],
      },
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
| Direction | `dir` | `ltr` \| `rtl` | inherited |
| Accessible label | `aria-label` | string | `Menu` |
| Items | `items` (property) | recursive `DropdownItem[]` | `[]` |

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
| `items` | `DropdownItem[]` | optional nested submenu; items can nest to any supported depth |
| `disabled` | boolean | disabled item; keyboard-focusable for discovery but never activatable |
| `newTab` | boolean | opens `href` in a new tab |
| `rel` | string | link rel (for `href`) |
| `testId` | string | optional testing id |

## Events

| Event | Detail | Description |
| --- | --- | --- |
| `close` | `{}` | Fires when overlay close is requested |
| `item-click` | `{ index, indexPath, item, id, path, href, trigger }` | Fires when an interactive leaf item is selected |

For a nested selection, `index` remains the selected item's index in its immediate
menu for compatibility. `indexPath` contains every index from the root menu to the
selected leaf. For example, selecting the second item inside the third root item
produces `index: 1` and `indexPath: [2, 1]`.

## Behavior

### Behavior & precedence

- `type="section"` and `type="separator"` are non-interactive.
- `type="item"` is interactive unless `disabled` is true.
- Legacy `type="label"` is still accepted and behaves like `type="section"`.
- A non-empty `items` array on an enabled `item` row makes the row a submenu
  trigger. Its submenu takes precedence over `href`, `path`, and leaf selection.
- A disabled submenu trigger does not open.
- Leaf interaction precedence is `href` > `path` > event-only item.
- `id` is identity only and does not control clickability.
- If `newTab` is true and `rel` is omitted, `rel="noopener noreferrer"` is applied.

### Nested menu keyboard behavior

- Up Arrow and Down Arrow move between item rows in the current menu. Disabled
  rows can receive focus but cannot be opened or selected.
- Home and End move to the first and last item.
- Enter or Space opens a submenu trigger, or selects the active leaf item.
- Typing printable characters moves focus to the next label matching the
  current typeahead buffer.
- In left-to-right layouts, Right Arrow opens a submenu and Left Arrow closes one
  submenu level. These keys are mirrored in right-to-left layouts.
- Escape closes the deepest open submenu and restores its trigger; at the root,
  it closes the dropdown. Tab closes the complete dropdown and continues normal
  focus navigation outside the menu.
- Opening a submenu with the keyboard focuses its first enabled item. Closing one
  level with the directional key returns focus to that submenu's trigger.

```html codePreview
<rtgl-dropdown-menu id="menu2" open x="24" y="24"></rtgl-dropdown-menu>

<script>
  const menu2 = document.getElementById("menu2");

  menu2.items = [
    { label: "Navigation", type: "section" },
    { id: "docs", label: "Docs", href: "/docs", newTab: true, rel: "noopener" },
    { id: "settings", label: "Settings", path: "/settings" },
    {
      id: "share",
      label: "Share",
      items: [
        { id: "copy-link", label: "Copy link" },
        {
          id: "social",
          label: "Social",
          items: [
            { id: "mastodon", label: "Mastodon" },
            { id: "bluesky", label: "Bluesky" },
          ],
        },
      ],
    },
    { id: "danger", label: "Delete", disabled: true },
    { type: "separator" },
    { id: "raw-action", label: "Custom action" },
  ];

  menu2.addEventListener("item-click", (e) => {
    console.log("selected path", e.detail.indexPath);

    if (e.detail.path) {
      console.log("route to", e.detail.path);
    }
  });

  menu2.render();
</script>
```
