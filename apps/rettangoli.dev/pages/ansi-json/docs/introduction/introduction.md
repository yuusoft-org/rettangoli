---
template: ansi-json-documentation
title: Introduction
tags: documentation
sidebarId: ansi-json-introduction
---

`rettangoli-ansi-json` renders declarative JSON documents into ANSI escape sequences.

It is the base rendering layer we can build on for richer terminal and future TUI workflows in Rettangoli.

## Why this package exists

- Keep terminal output declarative and testable as plain data.
- Support full ANSI text styling and control sequences.
- Reuse a single renderer across scripts, CLI output, and TUI experiments.

## What it supports today

- Styled text (`bold`, `italic`, `underline`, `fg`, `bg`, etc.).
- Style inheritance through nested span nodes.
- Named reusable styles.
- Control nodes for cursor movement, clearing, scroll, links, title, alt buffer, bell, clipboard, and raw sequences.

## Node model

The renderer accepts four node forms in `content`:

- Plain string node.
- `text` node.
- `children` span node.
- `ctrl` control node.

## Next

- [Getting Started](/ansi-json/docs/introduction/getting-started)
- [JSON Schema](/ansi-json/docs/reference/schema)
- [Control Nodes](/ansi-json/docs/reference/control-nodes)
