---
template: tui-documentation
title: Primitives
tags: documentation
sidebarId: tui-primitives
---

`@rettangoli/tui` ships native terminal primitives so views stay declarative and FE-like.

## Supported primitives

| Primitive | Purpose | Common attributes/props |
| --- | --- | --- |
| `rtgl-view` | Vertical/horizontal composition | `d` (`v`/`h`), `g` (gap) |
| `rtgl-text` | Text output | `s` (`h1`, `h2`, etc), `w` (`bold`) |
| `rtgl-input` | Single-line field display | `label`, `value`, `placeholder` |
| `rtgl-textarea` | Multiline field with cursor | `label`, `value`, `placeholder`, `w`, `h`, `active`, `cursorRow`, `cursorCol` |
| `rtgl-divider` | Horizontal/vertical line | `w` (horizontal), `o=v` + `h` (vertical), `c` (custom char) |
| `rtgl-image` | Terminal image rendering (kitty protocol) | `src` (PNG), `:data` (base64 PNG), `w`, `h`, `alt` |
| `rtgl-selector-dialog` | Floating selector overlay | `open`, `title`, `:options`, `:selectedIndex`, `size`, `x`, `y` |
| `rtgl-list` | Row list with highlight | `:items`, `:selectedIndex`, `w`, `marker`, `n` |
| `rtgl-table` | Full-width table with row highlight | `:data`, `:selectedIndex`, `w`, `variant`, `showHeader`, `highlight` |

## Example view

```yaml
template:
  - rtgl-view d=v g=sm:
      - rtgl-text w=bold: "Tasks"
      - rtgl-divider w=72: null
      - rtgl-image src="./assets/logo.png" w=16 h=6 alt="[image]": null
      - rtgl-list :items=taskListItems :selectedIndex=selectedTaskIndex w=f: null
      - rtgl-table :data=taskTableData :selectedIndex=selectedTaskIndex w=f cw=28: null
      - rtgl-selector-dialog open=${selectorOpen} size=md title="Pick Environment" :options=selectorOptions :selectedIndex=selectorIndex:
          - rtgl-text: "ArrowUp/ArrowDown and Enter"
```

## FE parity notes

- Component authoring contract remains FE-compatible.
- Primitive names intentionally mirror `rtgl-*` naming from UI/FE ecosystem.
- TUI primitives render terminal-native output and do not rely on ASCII placeholder layouts.
- `rtgl-image` currently supports PNG payloads only.

## Global imperative UI helpers

In interactive mode, handlers can call:

- `deps.ui.dialog(options)` for form/dialog overlays
- `deps.ui.selector(options)` for global single-choice overlays

Use these when selection/editing should be global and not coupled to component-local dialog state.

## Next

- [Dialog & Textarea](/tui/docs/guides/dialog-and-textarea)
- [List & Table](/tui/docs/guides/list-and-table)
