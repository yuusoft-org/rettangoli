# rettangoli-ansi-json - TUI Library for Node.js (ESM)

## Task 1: AnsiJson Schema Design

### Goal
Define a JSON format (`ansiJson`) that converts to ANSI escape sequences.
This is a **low-level TUI abstraction** - users work with JSON but get full ANSI power.

---

## Full ANSI Capabilities Reference

### 1. SGR (Select Graphic Rendition) - Text Styling

| Code | Attribute | Reset Code |
|------|-----------|------------|
| 0 | Reset all | - |
| 1 | Bold | 22 |
| 2 | Dim | 22 |
| 3 | Italic | 23 |
| 4 | Underline | 24 |
| 5 | Blink (slow) | 25 |
| 6 | Blink (rapid) | 25 |
| 7 | Reverse/Invert | 27 |
| 8 | Hidden/Conceal | 28 |
| 9 | Strikethrough | 29 |
| 21 | Double underline | 24 |
| 53 | Overline | 55 |

### 2. Colors

| Type | Foreground | Background |
|------|------------|------------|
| Standard (8) | 30-37 | 40-47 |
| Bright (8) | 90-97 | 100-107 |
| 256-color | 38;5;n | 48;5;n |
| True color | 38;2;r;g;b | 48;2;r;g;b |
| Default | 39 | 49 |

### 3. Cursor Movement

| Sequence | Action |
|----------|--------|
| `\x1b[{n}A` | Move up n lines |
| `\x1b[{n}B` | Move down n lines |
| `\x1b[{n}C` | Move right n columns |
| `\x1b[{n}D` | Move left n columns |
| `\x1b[{n}E` | Move to beginning of line, n lines down |
| `\x1b[{n}F` | Move to beginning of line, n lines up |
| `\x1b[{n}G` | Move to column n |
| `\x1b[{row};{col}H` | Move to absolute position |
| `\x1b[{row};{col}f` | Move to absolute position (alt) |

### 4. Cursor Visibility & State

| Sequence | Action |
|----------|--------|
| `\x1b[?25h` | Show cursor |
| `\x1b[?25l` | Hide cursor |
| `\x1b[s` or `\x1b7` | Save cursor position |
| `\x1b[u` or `\x1b8` | Restore cursor position |

### 5. Screen/Line Clearing

| Sequence | Action |
|----------|--------|
| `\x1b[0J` | Clear from cursor to end of screen |
| `\x1b[1J` | Clear from cursor to beginning of screen |
| `\x1b[2J` | Clear entire screen |
| `\x1b[3J` | Clear entire screen + scrollback |
| `\x1b[0K` | Clear from cursor to end of line |
| `\x1b[1K` | Clear from cursor to beginning of line |
| `\x1b[2K` | Clear entire line |

### 6. Scrolling

| Sequence | Action |
|----------|--------|
| `\x1b[{n}S` | Scroll up n lines |
| `\x1b[{n}T` | Scroll down n lines |
| `\x1b[{top};{bottom}r` | Set scroll region |
| `\x1b[r` | Reset scroll region |

### 7. OSC (Operating System Commands)

| Sequence | Action |
|----------|--------|
| `\x1b]0;{title}\x07` | Set window title |
| `\x1b]8;;{url}\x07{text}\x1b]8;;\x07` | Hyperlink |
| `\x1b]52;c;{base64}\x07` | Set clipboard |
| `\x1b]9;{msg}\x07` | Desktop notification (iTerm2) |

### 8. Alternate Screen Buffer

| Sequence | Action |
|----------|--------|
| `\x1b[?1049h` | Enable alternate buffer |
| `\x1b[?1049l` | Disable alternate buffer |

### 9. Mouse Tracking (Optional/Advanced)

| Sequence | Action |
|----------|--------|
| `\x1b[?1000h` | Enable mouse click reporting |
| `\x1b[?1003h` | Enable all mouse tracking |
| `\x1b[?1006h` | Enable SGR mouse mode |

---

## Industry Research

### Existing Patterns in Popular Libraries

| Library | Platform | Approach |
|---------|----------|----------|
| **Rich/Textual** | Python | `Style` objects with named attrs, segment tuples `(text, style, control)` |
| **Ink** | Node.js/React | Props-based: `color`, `backgroundColor`, boolean attrs |
| **Blessed** | Node.js | Nested style objects with `fg`/`bg` |
| **Chalk** | Node.js | Method chaining, not JSON-native |

### No Formal Spec Exists
ECMA-48 defines ANSI SGR codes, but no standard JSON schema for styled terminal text.

---

## Open Questions - Recommendations

### 1. Should we support style inheritance (nested spans)?

**Recommendation: YES, support it**

**Rationale:**
- ANSI itself doesn't have inheritance (each SGR is absolute), but JSON ergonomics benefit greatly
- Reduces repetition: parent style applies to all children
- Converter flattens to absolute styles during output
- Common in Rich/Textual (Python's most powerful TUI)

**Implementation:**
```json
{
  "style": { "bold": true },
  "children": [
    { "text": "All bold. " },
    { "text": "Also red.", "style": { "fg": "red" } }
  ]
}
```
Converter outputs: `\x1b[1mAll bold. \x1b[1;31mAlso red.\x1b[0m`

---

### 2. Allow inline strings for unstyled text?

**Recommendation: YES, allow it**

**Rationale:**
- Drastically reduces verbosity for common case (plain text)
- Easy to parse: `typeof item === 'string'`
- Follows JSON conventions (primitives are valid)

**Implementation:**
```json
{
  "content": [
    "Hello ",
    { "text": "World", "style": { "fg": "red" } },
    "!"
  ]
}
```

---

### 3. Support named/reusable styles?

**Recommendation: YES, support it**

**Rationale:**
- Reduces duplication in complex documents
- Familiar pattern (CSS classes, theme tokens)
- Easy to implement: resolve refs before rendering

**Implementation:**
```json
{
  "styles": {
    "error": { "fg": "red", "bold": true },
    "success": { "fg": "green" },
    "link": { "fg": "cyan", "underline": true }
  },
  "content": [
    { "text": "Error!", "style": "error" },
    { "text": "OK", "style": "success" },
    { "text": "Click", "style": ["link", { "bold": true }] }
  ]
}
```
- `"style": "error"` - reference by name
- `"style": ["link", { ... }]` - extend/override named style

---

### 4. Cursor movement / positioning in scope?

**Recommendation: YES, full ANSI control sequences in scope**

**Rationale:**
- This is a low-level TUI library - must expose full ANSI power
- Text styling alone is insufficient for TUI (need cursor, clearing, scrolling)
- Separate "control" nodes from "text" nodes for clarity

**Implementation - Control Nodes:**

```json
{
  "content": [
    { "ctrl": "clear", "mode": "screen" },
    { "ctrl": "cursor", "action": "move", "row": 1, "col": 1 },
    { "text": "Header", "style": { "bold": true } },
    { "ctrl": "cursor", "action": "move", "row": 3, "col": 1 },
    { "text": "Content here" },
    { "ctrl": "cursor", "action": "hide" }
  ]
}
```

---

## Final Schema Design (JSON Schema)

### Node Types Overview

The schema uses a **discriminated union** of node types:

| Node Type | Discriminator | Purpose |
|-----------|---------------|---------|
| Plain string | `typeof === "string"` | Unstyled text shorthand |
| TextNode | has `text` property | Styled text |
| SpanNode | has `children` property | Container with style inheritance |
| ControlNode | has `ctrl` property | ANSI control sequences |

---

### JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://rettangoli.dev/schemas/ansi-json-v1.json",
  "title": "AnsiJson",
  "description": "JSON format for ANSI terminal output",
  
  "definitions": {
    
    "color": {
      "description": "Color value: named, hex, rgb(), or 256-index",
      "oneOf": [
        {
          "type": "string",
          "enum": [
            "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
            "brightBlack", "brightRed", "brightGreen", "brightYellow",
            "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
            "default"
          ]
        },
        {
          "type": "string",
          "pattern": "^#[0-9a-fA-F]{6}$",
          "description": "Hex color: #rrggbb"
        },
        {
          "type": "string",
          "pattern": "^rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\)$",
          "description": "RGB color: rgb(r,g,b) with optional whitespace"
        },
        {
          "type": "integer",
          "minimum": 0,
          "maximum": 255,
          "description": "256-color index"
        }
      ]
    },
    
    "style": {
      "type": "object",
      "description": "Text styling attributes",
      "properties": {
        "fg": { "$ref": "#/definitions/color" },
        "bg": { "$ref": "#/definitions/color" },
        "bold": { "type": "boolean" },
        "dim": { "type": "boolean" },
        "italic": { "type": "boolean" },
        "underline": {
          "oneOf": [
            { "type": "boolean" },
            { "type": "string", "enum": ["double"] }
          ]
        },
        "blink": {
          "oneOf": [
            { "type": "boolean" },
            { "type": "string", "enum": ["rapid"] }
          ]
        },
        "reverse": { "type": "boolean" },
        "hidden": { "type": "boolean" },
        "strike": { "type": "boolean" },
        "overline": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    
    "styleRef": {
      "description": "Style reference: inline object or named ref (use nesting for composition)",
      "oneOf": [
        { "$ref": "#/definitions/style" },
        { "type": "string", "description": "Named style reference" }
      ]
    },
    
    "textNode": {
      "type": "object",
      "description": "Styled text node",
      "properties": {
        "text": { "type": "string" },
        "style": { "$ref": "#/definitions/styleRef" }
      },
      "required": ["text"],
      "additionalProperties": false
    },
    
    "spanNode": {
      "type": "object",
      "description": "Container node with style inheritance",
      "properties": {
        "style": { "$ref": "#/definitions/styleRef" },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/node" }
        }
      },
      "required": ["children"],
      "additionalProperties": false
    },
    
    "cursorControl": {
      "type": "object",
      "description": "Cursor movement and visibility control",
      "properties": {
        "ctrl": { "const": "cursor" },
        "to": {
          "type": "object",
          "properties": {
            "row": { "type": "integer", "minimum": 1 },
            "col": { "type": "integer", "minimum": 1 }
          },
          "description": "Absolute position"
        },
        "up": { "type": "integer", "minimum": 1 },
        "down": { "type": "integer", "minimum": 1 },
        "left": { "type": "integer", "minimum": 1 },
        "right": { "type": "integer", "minimum": 1 },
        "col": { "type": "integer", "minimum": 1, "description": "Move to column" },
        "nextLine": { "type": "integer", "minimum": 1 },
        "prevLine": { "type": "integer", "minimum": 1 },
        "show": { "type": "boolean" },
        "hide": { "type": "boolean" },
        "save": { "type": "boolean" },
        "restore": { "type": "boolean" }
      },
      "required": ["ctrl"],
      "additionalProperties": false
    },
    
    "clearControl": {
      "type": "object",
      "properties": {
        "ctrl": { "const": "clear" },
        "mode": {
          "enum": ["screen", "screenEnd", "screenStart", "screenAll", "line", "lineEnd", "lineStart"]
        }
      },
      "required": ["ctrl", "mode"],
      "additionalProperties": false
    },
    
    "scrollControl": {
      "type": "object",
      "description": "Scroll screen content",
      "properties": {
        "ctrl": { "const": "scroll" },
        "up": { "type": "integer", "minimum": 1 },
        "down": { "type": "integer", "minimum": 1 }
      },
      "required": ["ctrl"],
      "additionalProperties": false
    },
    
    "scrollRegionControl": {
      "type": "object",
      "description": "Set or reset scroll region",
      "properties": {
        "ctrl": { "const": "scrollRegion" },
        "top": { "type": "integer", "minimum": 1 },
        "bottom": { "type": "integer", "minimum": 1 },
        "reset": { "type": "boolean", "description": "Reset to full screen" }
      },
      "required": ["ctrl"],
      "additionalProperties": false
    },
    
    "titleControl": {
      "type": "object",
      "properties": {
        "ctrl": { "const": "title" },
        "text": { "type": "string" }
      },
      "required": ["ctrl", "text"],
      "additionalProperties": false
    },
    
    "linkControl": {
      "type": "object",
      "description": "Hyperlink with optional styling",
      "properties": {
        "ctrl": { "const": "link" },
        "url": { "type": "string", "format": "uri" },
        "text": { "type": "string" },
        "style": { "$ref": "#/definitions/styleRef" }
      },
      "required": ["ctrl", "url", "text"],
      "additionalProperties": false
    },
    
    "altBufferControl": {
      "type": "object",
      "properties": {
        "ctrl": { "const": "altBuffer" },
        "enable": { "type": "boolean" }
      },
      "required": ["ctrl", "enable"],
      "additionalProperties": false
    },
    
    "resetControl": {
      "type": "object",
      "properties": {
        "ctrl": { "const": "reset" }
      },
      "required": ["ctrl"],
      "additionalProperties": false
    },
    
    "bellControl": {
      "type": "object",
      "description": "Terminal bell/beep",
      "properties": {
        "ctrl": { "const": "bell" }
      },
      "required": ["ctrl"],
      "additionalProperties": false
    },
    
    "clipboardControl": {
      "type": "object",
      "description": "Set clipboard content (OSC 52)",
      "properties": {
        "ctrl": { "const": "clipboard" },
        "content": { "type": "string" },
        "target": {
          "type": "string",
          "enum": ["clipboard", "primary", "select"],
          "default": "clipboard",
          "description": "c=clipboard, p=primary, s=select"
        }
      },
      "required": ["ctrl", "content"],
      "additionalProperties": false
    },
    
    "rawControl": {
      "type": "object",
      "description": "Raw escape sequence passthrough for advanced/unsupported sequences",
      "properties": {
        "ctrl": { "const": "raw" },
        "sequence": { 
          "type": "string",
          "description": "Raw ANSI escape sequence (without ESC prefix)"
        }
      },
      "required": ["ctrl", "sequence"],
      "additionalProperties": false
    },
    
    "controlNode": {
      "description": "ANSI control sequence node",
      "oneOf": [
        { "$ref": "#/definitions/cursorControl" },
        { "$ref": "#/definitions/clearControl" },
        { "$ref": "#/definitions/scrollControl" },
        { "$ref": "#/definitions/scrollRegionControl" },
        { "$ref": "#/definitions/titleControl" },
        { "$ref": "#/definitions/linkControl" },
        { "$ref": "#/definitions/altBufferControl" },
        { "$ref": "#/definitions/resetControl" },
        { "$ref": "#/definitions/bellControl" },
        { "$ref": "#/definitions/clipboardControl" },
        { "$ref": "#/definitions/rawControl" }
      ]
    },
    
    "node": {
      "description": "Any content node",
      "oneOf": [
        { "type": "string" },
        { "$ref": "#/definitions/textNode" },
        { "$ref": "#/definitions/spanNode" },
        { "$ref": "#/definitions/controlNode" }
      ]
    }
  },
  
  "type": "object",
  "properties": {
    "$schema": { "type": "string" },
    "version": { "type": "string", "enum": ["1.0"] },
    "styles": {
      "type": "object",
      "additionalProperties": { "$ref": "#/definitions/style" },
      "description": "Named style definitions"
    },
    "content": {
      "type": "array",
      "items": { "$ref": "#/definitions/node" },
      "description": "Content nodes to render"
    }
  },
  "required": ["content"],
  "additionalProperties": false
}
```

---

## Complete Examples

### Example 1: Simple Styled Text

```json
{
  "content": [
    "Hello ",
    { "text": "World", "style": { "fg": "red", "bold": true } },
    "!"
  ]
}
```

Output: `Hello \x1b[31;1mWorld\x1b[0m!`

### Example 2: Nested Styles (Inheritance)

```json
{
  "content": [
    {
      "style": { "fg": "cyan" },
      "children": [
        "All cyan. ",
        { "text": "Cyan + bold.", "style": { "bold": true } },
        " Back to just cyan."
      ]
    }
  ]
}
```

### Example 3: Named Styles

```json
{
  "styles": {
    "header": { "fg": "white", "bg": "blue", "bold": true },
    "error": { "fg": "red", "bold": true }
  },
  "content": [
    { "text": "=== My App ===", "style": "header" },
    "\n\n",
    { "text": "Something went wrong!", "style": "error" },
    "\n",
    {
      "style": "error",
      "children": [
        { "text": "(error code: 42)", "style": { "dim": true } }
      ]
    }
  ]
}
```

### Example 4: Full TUI Screen

```json
{
  "styles": {
    "title": { "fg": "white", "bg": "blue", "bold": true },
    "menu": { "fg": "cyan" },
    "selected": { "fg": "black", "bg": "white" }
  },
  "content": [
    { "ctrl": "altBuffer", "enable": true },
    { "ctrl": "clear", "mode": "screen" },
    { "ctrl": "cursor", "hide": true },
    { "ctrl": "cursor", "to": { "row": 1, "col": 1 } },
    
    { "text": " File  Edit  View  Help ", "style": "title" },
    
    { "ctrl": "cursor", "to": { "row": 3, "col": 2 } },
    { "text": "▶ New File", "style": "selected" },
    
    { "ctrl": "cursor", "to": { "row": 4, "col": 2 } },
    { "text": "  Open File", "style": "menu" },
    
    { "ctrl": "cursor", "to": { "row": 5, "col": 2 } },
    { "text": "  Save", "style": "menu" }
  ]
}
```

### Example 5: Hyperlinks

```json
{
  "content": [
    "Check out ",
    { "ctrl": "link", "url": "https://github.com", "text": "GitHub", "style": { "fg": "cyan" } },
    " for more info."
  ]
}
```

---

## Style Property Reference

| Property | Type | Values | SGR Code |
|----------|------|--------|----------|
| `fg` | color | see color definition | 30-37, 90-97, 38;5;n, 38;2;r;g;b |
| `bg` | color | see color definition | 40-47, 100-107, 48;5;n, 48;2;r;g;b |
| `bold` | boolean | true/false | 1 / 22 |
| `dim` | boolean | true/false | 2 / 22 |
| `italic` | boolean | true/false | 3 / 23 |
| `underline` | boolean or "double" | true/false/"double" | 4, 21 / 24 |
| `blink` | boolean or "rapid" | true/false/"rapid" | 5, 6 / 25 |
| `reverse` | boolean | true/false | 7 / 27 |
| `hidden` | boolean | true/false | 8 / 28 |
| `strike` | boolean | true/false | 9 / 29 |
| `overline` | boolean | true/false | 53 / 55 |

### Named Colors

```
Standard (8):   black, red, green, yellow, blue, magenta, cyan, white
Bright (8):     brightBlack, brightRed, brightGreen, brightYellow,
                brightBlue, brightMagenta, brightCyan, brightWhite
Special:        default (reset to terminal default)
```

### Color Formats

| Format | Example | Description |
|--------|---------|-------------|
| Named | `"red"` | Standard 16 colors |
| Hex | `"#ff0000"` | True color (24-bit) |
| RGB | `"rgb(255,0,0)"` | True color (24-bit) |
| Index | `166` | 256-color palette |

---

## Control Node Reference

| ctrl | Properties | Example |
|------|------------|---------|
| `cursor` | `up`, `down`, `left`, `right` (int) | `{ "ctrl": "cursor", "down": 3 }` |
| `cursor` | `nextLine`, `prevLine` (int) | `{ "ctrl": "cursor", "nextLine": 1 }` |
| `cursor` | `to: { row, col }` | `{ "ctrl": "cursor", "to": { "row": 1, "col": 1 } }` |
| `cursor` | `col` (int) | `{ "ctrl": "cursor", "col": 10 }` |
| `cursor` | `show`, `hide` (bool) | `{ "ctrl": "cursor", "hide": true }` |
| `cursor` | `save`, `restore` (bool) | `{ "ctrl": "cursor", "save": true }` |
| `clear` | `mode` | `{ "ctrl": "clear", "mode": "screen" }` |
| `scroll` | `up`, `down` (int) | `{ "ctrl": "scroll", "up": 3 }` |
| `scrollRegion` | `top`, `bottom` or `reset` | `{ "ctrl": "scrollRegion", "top": 2, "bottom": 10 }` |
| `title` | `text` | `{ "ctrl": "title", "text": "My App" }` |
| `link` | `url`, `text`, `style` (opt) | `{ "ctrl": "link", "url": "...", "text": "click" }` |
| `altBuffer` | `enable` | `{ "ctrl": "altBuffer", "enable": true }` |
| `reset` | - | `{ "ctrl": "reset" }` |
| `bell` | - | `{ "ctrl": "bell" }` |
| `clipboard` | `content`, `target` (opt) | `{ "ctrl": "clipboard", "content": "text" }` |
| `raw` | `sequence` | `{ "ctrl": "raw", "sequence": "[6n" }` |

### Clear Modes
`screen`, `screenEnd`, `screenStart`, `screenAll`, `line`, `lineEnd`, `lineStart`

### Newlines
Newline characters (`\n`) in text strings are preserved and output as-is.

---

## ANSI Coverage Audit

| Feature | Status | Notes |
|---------|--------|-------|
| SGR (all text attributes) | ✅ Covered | bold, dim, italic, underline, blink, reverse, hidden, strike, overline |
| Colors (16/256/true) | ✅ Covered | Named, hex, rgb(), 256-index |
| Cursor move (A/B/C/D) | ✅ Covered | `up`, `down`, `left`, `right` properties |
| Cursor line-start (E/F) | ✅ Covered | `nextLine`, `prevLine` properties |
| Cursor position (H/f) | ✅ Covered | `to: { row, col }` |
| Cursor column (G) | ✅ Covered | `col` property |
| Cursor show/hide | ✅ Covered | `show`, `hide` properties |
| Cursor save/restore | ✅ Covered | `save`, `restore` properties |
| Clear screen/line | ✅ Covered | All modes |
| Scroll up/down | ✅ Covered | scroll |
| Scroll region | ✅ Covered | scrollRegion |
| Window title (OSC 0) | ✅ Covered | title |
| Hyperlinks (OSC 8) | ✅ Covered | link |
| Clipboard (OSC 52) | ✅ Covered | clipboard |
| Alt buffer | ✅ Covered | altBuffer |
| Bell/beep | ✅ Covered | bell |
| Raw passthrough | ✅ Covered | raw (escape hatch) |
| Mouse tracking | ❌ Excluded | Input handling, not output |
| Notifications (OSC 9) | ❌ Excluded | Too terminal-specific (iTerm2 only) |

---

## Design Decisions Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Style inheritance | ✅ Yes | Reduces repetition, use nesting |
| Inline strings | ✅ Yes | Ergonomic, easy to parse |
| Named styles | ✅ Yes | Reusability, theming |
| Style array merge | ❌ Dropped | Use nesting instead (simpler) |
| Cursor/control | ✅ Yes | Full ANSI power required for TUI |
| Link styling | ✅ Yes | Links can have `style` property |
| Node discrimination | By property | `text` = TextNode, `children` = SpanNode, `ctrl` = ControlNode, `string` = plain |
| Cursor schema | Unified | Single `cursorControl` with optional properties vs fragmented |

---

## Next Steps

- [x] Finalize schema based on discussion
- [x] Extract JSON Schema to `schemas/ansi-json-v1.schema.json`
- [x] Implement `ansiJson -> ANSI string` converter (ESM, vanilla JS + JSDoc)
- [x] Write tests with edge cases
- [ ] Add terminal capability detection (optional)

---

## Implementation Checklist

### File Organization

```
src/
  index.js          # Main entry - exports render()
  style.js          # Style resolution, merging, SGR codes
  controls.js       # Control node rendering
  colors.js         # Color parsing (named, hex, rgb, 256)
```

### Core Rendering (`index.js`)

- [x] `render(doc)` - main entry point
- [x] `renderNodes(nodes, styles, inheritedStyle)` - render array of nodes
- [x] `renderNode(node, ...)` - dispatch by node type
- [x] Plain string nodes
- [x] TextNode (`text` property)
- [x] SpanNode (`children` property) with style inheritance
- [x] ControlNode (`ctrl` property)

### Style System (`style.js`)

- [x] `resolveStyle(styleRef, styles)` - resolve named ref to object
- [x] `mergeStyles(base, override)` - merge two style objects
- [x] `applyStyle(text, style)` - wrap text with SGR codes
- [x] `styleToCodes(style)` - convert style object to SGR codes

#### SGR Attributes
- [x] `bold` (SGR 1)
- [x] `dim` (SGR 2)
- [x] `italic` (SGR 3)
- [x] `underline` (SGR 4)
- [x] `underline: "double"` (SGR 21)
- [x] `blink` (SGR 5)
- [x] `blink: "rapid"` (SGR 6)
- [x] `reverse` (SGR 7)
- [x] `hidden` (SGR 8)
- [x] `strike` (SGR 9)
- [x] `overline` (SGR 53)

### Colors (`colors.js`)

- [x] Named colors (16 standard)
  - [x] black, red, green, yellow, blue, magenta, cyan, white
  - [x] brightBlack, brightRed, brightGreen, brightYellow, brightBlue, brightMagenta, brightCyan, brightWhite
  - [x] default (reset)
- [x] Hex colors (`#rrggbb`) → SGR 38;2;r;g;b
- [x] RGB colors (`rgb(r,g,b)`) → SGR 38;2;r;g;b
- [x] 256-color index → SGR 38;5;n
- [x] Foreground vs background (30s vs 40s, 38 vs 48)

### Control Nodes (`controls.js`)

#### Cursor Control (`ctrl: "cursor"`)
- [x] `to: { row, col }` → `\x1b[row;colH`
- [x] `up: n` → `\x1b[nA`
- [x] `down: n` → `\x1b[nB`
- [x] `right: n` → `\x1b[nC`
- [x] `left: n` → `\x1b[nD`
- [x] `nextLine: n` → `\x1b[nE`
- [x] `prevLine: n` → `\x1b[nF`
- [x] `col: n` → `\x1b[nG`
- [x] `show: true` → `\x1b[?25h`
- [x] `hide: true` → `\x1b[?25l`
- [x] `save: true` → `\x1b[s`
- [x] `restore: true` → `\x1b[u`

#### Clear Control (`ctrl: "clear"`)
- [x] `mode: "screen"` → `\x1b[2J`
- [x] `mode: "screenEnd"` → `\x1b[0J`
- [x] `mode: "screenStart"` → `\x1b[1J`
- [x] `mode: "screenAll"` → `\x1b[3J`
- [x] `mode: "line"` → `\x1b[2K`
- [x] `mode: "lineEnd"` → `\x1b[0K`
- [x] `mode: "lineStart"` → `\x1b[1K`

#### Scroll Control (`ctrl: "scroll"`)
- [x] `up: n` → `\x1b[nS`
- [x] `down: n` → `\x1b[nT`

#### Scroll Region (`ctrl: "scrollRegion"`)
- [x] `top, bottom` → `\x1b[top;bottomr`
- [x] `reset: true` → `\x1b[r`

#### Other Controls
- [x] `ctrl: "title"` → `\x1b]0;text\x07`
- [x] `ctrl: "link"` → `\x1b]8;;url\x07text\x1b]8;;\x07`
  - [x] With style support
- [x] `ctrl: "altBuffer"` → `\x1b[?1049h/l`
- [x] `ctrl: "reset"` → `\x1b[0m`
- [x] `ctrl: "bell"` → `\x07`
- [x] `ctrl: "clipboard"` → `\x1b]52;target;base64\x07`
- [x] `ctrl: "raw"` → `\x1b{sequence}`

### Tests (`spec/`)

#### Basic Tests
- [x] Plain string
- [x] Multiple plain strings
- [x] Empty content array
- [x] Empty text string
- [x] Mixed node types in content

#### Style Tests
- [x] Bold text
- [x] Colored text (named)
- [x] Bold + color combined
- [x] Named style reference
- [x] Hex color (`#ff0000`)
- [x] RGB color (`rgb(255,0,0)`)
- [x] RGB color with spaces
- [x] 256-color index
- [x] Background colors
- [x] Default color reset
- [x] All SGR attributes (dim, italic, underline, blink, reverse, hidden, strike, overline)
- [x] Double underline
- [x] Rapid blink
- [x] Multiple attributes combined
- [x] Style inheritance (nested spans)
- [x] Nested style override
- [x] Nested additive styles
- [x] Deep nesting (3+ levels)
- [x] Span with named style
- [x] Nested spans with no style

#### Control Tests
- [x] Cursor to position
- [x] Cursor up, down, left, right
- [x] Cursor nextLine, prevLine
- [x] Cursor column
- [x] Cursor show, hide
- [x] Cursor save, restore
- [x] Cursor multiple actions
- [x] All clear modes (screen, screenEnd, screenStart, screenAll, line, lineEnd, lineStart)
- [x] Scroll up/down
- [x] Scroll region set/reset
- [x] Reset
- [x] Bell
- [x] Title
- [x] Link (basic)
- [x] Link with style
- [x] Alt buffer enable/disable
- [x] Clipboard
- [x] Clipboard with target
- [x] Raw passthrough

### Future / Optional

- [ ] Terminal capability detection (TERM, COLORTERM)
- [ ] Graceful degradation (true color → 256 → 16 → none)
- [ ] Validation against JSON Schema
- [ ] Pretty error messages for invalid input
- [ ] Streaming render for large documents
