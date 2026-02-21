---
template: ansi-json-documentation
title: Control Nodes
tags: documentation
sidebarId: ansi-json-control-nodes
---

Control nodes emit ANSI control sequences and are identified by the `ctrl` field.

## Core controls

- `cursor`: absolute/relative movement, show/hide, save/restore.
- `clear`: clear screen or line modes.
- `scroll`: scroll up/down.
- `scrollRegion`: define/reset scroll region.
- `reset`: reset SGR state.
- `bell`: terminal bell.

## OSC and terminal integrations

- `title`: set terminal window title.
- `link`: OSC 8 hyperlinks with optional style.
- `clipboard`: OSC 52 clipboard updates.
- `altBuffer`: enter/exit alternate screen buffer.
- `raw`: emit raw escape sequence payload.

## Example

```js
{
  content: [
    { ctrl: "altBuffer", enable: true },
    { ctrl: "cursor", hide: true },
    { ctrl: "clear", mode: "screen" },
    { ctrl: "cursor", to: { row: 1, col: 1 } },
    { text: "Rettangoli TUI", style: { fg: "white", bg: "blue", bold: true } },
    { ctrl: "cursor", show: true },
    { ctrl: "altBuffer", enable: false }
  ]
}
```
