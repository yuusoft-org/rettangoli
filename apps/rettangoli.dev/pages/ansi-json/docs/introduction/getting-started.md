---
template: ansi-json-documentation
title: Getting Started
tags: documentation
sidebarId: ansi-json-getting-started
---

## Install

```bash
npm install rettangoli-ansi-json
```

## Render your first document

```js
import { render } from 'rettangoli-ansi-json';

const doc = {
  content: [
    'Hello ',
    { text: 'Rettangoli', style: { fg: 'green', bold: true } },
    '!\n'
  ]
};

process.stdout.write(render(doc));
```

## Basic shape

```js
{
  styles: {
    warning: { fg: 'yellow', bold: true }
  },
  content: [
    "plain text",
    { text: "styled text", style: "warning" },
    {
      style: { underline: true },
      children: ["nested span content"]
    },
    { ctrl: "cursor", to: { row: 1, col: 1 } }
  ]
}
```

## Useful links

- [JSON Schema](/ansi-json/docs/reference/schema)
- [Control Nodes](/ansi-json/docs/reference/control-nodes)
