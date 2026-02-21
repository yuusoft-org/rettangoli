---
template: ansi-json-documentation
title: JSON Schema
tags: documentation
sidebarId: ansi-json-schema
---

`rettangoli-ansi-json` ships a schema at:

`node_modules/rettangoli-ansi-json/schemas/ansi-json-v1.schema.json`

## Usage

```json
{
  "$schema": "./node_modules/rettangoli-ansi-json/schemas/ansi-json-v1.schema.json",
  "content": [
    { "text": "Hello", "style": { "fg": "cyan", "bold": true } }
  ]
}
```

## Top-level fields

- `content` (required): array of render nodes.
- `styles` (optional): named style dictionary.
- `version` (optional): currently `"1.0"`.

## Style color formats

- Named colors (`red`, `brightBlue`, `default`).
- Hex (`#rrggbb`).
- RGB string (`rgb(255, 0, 0)`).
- 256-color index (`0-255`).
