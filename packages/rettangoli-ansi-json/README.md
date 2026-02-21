# rettangoli-ansi-json

A low-level JSON-to-ANSI renderer for Node.js. Define terminal output as JSON, get ANSI escape sequences. This package is the foundation for future Rettangoli TUI support.

## Installation

```bash
npm install rettangoli-ansi-json
# or
bun add rettangoli-ansi-json
```

## Quick Start

```javascript
import { render } from 'rettangoli-ansi-json';

const doc = {
  content: [
    'Hello ',
    { text: 'World', style: { fg: 'green', bold: true } },
    '!\n'
  ]
};

console.log(render(doc));
// Outputs: Hello <green bold>World</green bold>!
```

## Why rettangoli-ansi-json?

- **Declarative** - Define UI as data, not escape code strings
- **Full ANSI support** - Colors, styles, cursor, screen control
- **Style inheritance** - Nested styles like CSS
- **Named styles** - Reusable style definitions
- **Zero dependencies** - Pure JavaScript

## API

### `render(doc)`

Converts an AnsiJson document to an ANSI escape sequence string.

```javascript
import { render } from 'rettangoli-ansi-json';

const output = render({
  styles: { ... },  // optional named styles
  content: [ ... ]  // array of nodes
});

process.stdout.write(output);
```

## Document Structure

```javascript
{
  // Optional: named style definitions
  "styles": {
    "error": { "fg": "red", "bold": true },
    "success": { "fg": "green" }
  },
  
  // Required: content nodes
  "content": [
    // ... nodes
  ]
}
```

## Node Types

### Plain String

```javascript
"Hello World"
```

### Text Node

Styled text with optional style.

```javascript
{ "text": "Hello", "style": { "fg": "red" } }

// With named style
{ "text": "Error!", "style": "error" }
```

### Span Node

Container with style inheritance.

```javascript
{
  "style": { "bold": true },
  "children": [
    "Bold text ",
    { "text": "Bold and red", "style": { "fg": "red" } }
  ]
}
```

### Control Node

ANSI control sequences.

```javascript
{ "ctrl": "cursor", "to": { "row": 1, "col": 1 } }
{ "ctrl": "clear", "mode": "screen" }
{ "ctrl": "reset" }
```

## Styles

### Text Attributes

| Property | Type | Description |
|----------|------|-------------|
| `bold` | boolean | Bold text |
| `dim` | boolean | Dim/faint text |
| `italic` | boolean | Italic text |
| `underline` | boolean \| `"double"` | Underline |
| `blink` | boolean \| `"rapid"` | Blinking text |
| `reverse` | boolean | Swap fg/bg |
| `hidden` | boolean | Hidden text |
| `strike` | boolean | Strikethrough |
| `overline` | boolean | Overline |

### Colors

```javascript
// Named colors (16)
{ "fg": "red" }
{ "fg": "brightBlue" }

// Hex
{ "fg": "#ff5500" }

// RGB
{ "fg": "rgb(255, 85, 0)" }

// 256-color index
{ "fg": 166 }

// Background
{ "bg": "blue" }
```

**Named colors:** `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `brightBlack`, `brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`, `brightWhite`, `default`

## Control Nodes

### Cursor

```javascript
// Move to position
{ "ctrl": "cursor", "to": { "row": 1, "col": 1 } }

// Relative movement
{ "ctrl": "cursor", "up": 5 }
{ "ctrl": "cursor", "down": 3 }
{ "ctrl": "cursor", "left": 2 }
{ "ctrl": "cursor", "right": 10 }

// Line movement
{ "ctrl": "cursor", "nextLine": 1 }
{ "ctrl": "cursor", "prevLine": 1 }

// Column
{ "ctrl": "cursor", "col": 20 }

// Visibility
{ "ctrl": "cursor", "hide": true }
{ "ctrl": "cursor", "show": true }

// Save/restore
{ "ctrl": "cursor", "save": true }
{ "ctrl": "cursor", "restore": true }
```

### Clear

```javascript
// Screen
{ "ctrl": "clear", "mode": "screen" }      // entire screen
{ "ctrl": "clear", "mode": "screenEnd" }   // cursor to end
{ "ctrl": "clear", "mode": "screenStart" } // cursor to start
{ "ctrl": "clear", "mode": "screenAll" }   // screen + scrollback

// Line
{ "ctrl": "clear", "mode": "line" }        // entire line
{ "ctrl": "clear", "mode": "lineEnd" }     // cursor to end
{ "ctrl": "clear", "mode": "lineStart" }   // cursor to start
```

### Scroll

```javascript
// Scroll content
{ "ctrl": "scroll", "up": 3 }
{ "ctrl": "scroll", "down": 2 }

// Scroll region
{ "ctrl": "scrollRegion", "top": 5, "bottom": 20 }
{ "ctrl": "scrollRegion", "reset": true }
```

### Other Controls

```javascript
// Reset all styles
{ "ctrl": "reset" }

// Terminal bell
{ "ctrl": "bell" }

// Window title
{ "ctrl": "title", "text": "My App" }

// Alternate buffer (fullscreen apps)
{ "ctrl": "altBuffer", "enable": true }
{ "ctrl": "altBuffer", "enable": false }

// Hyperlinks
{ "ctrl": "link", "url": "https://example.com", "text": "Click here" }
{ "ctrl": "link", "url": "...", "text": "Styled", "style": { "fg": "cyan" } }

// Clipboard (OSC 52)
{ "ctrl": "clipboard", "content": "copied text" }
{ "ctrl": "clipboard", "content": "...", "target": "primary" }

// Raw escape sequence
{ "ctrl": "raw", "sequence": "[6n" }
```

## Examples

### Styled Text

```javascript
import { render } from 'rettangoli-ansi-json';

console.log(render({
  content: [
    { text: 'Error: ', style: { fg: 'red', bold: true } },
    { text: 'Something went wrong', style: { fg: 'red' } },
    '\n'
  ]
}));
```

### Named Styles

```javascript
console.log(render({
  styles: {
    header: { fg: 'white', bg: 'blue', bold: true },
    link: { fg: 'cyan', underline: true }
  },
  content: [
    { text: ' My App ', style: 'header' },
    '\n\n',
    'Visit: ',
    { text: 'https://example.com', style: 'link' },
    '\n'
  ]
}));
```

### Style Inheritance

```javascript
console.log(render({
  content: [
    {
      style: { fg: 'blue' },
      children: [
        'All blue. ',
        { text: 'Blue and bold.', style: { bold: true } },
        ' Still blue.'
      ]
    }
  ]
}));
```

### Full Screen App

```javascript
console.log(render({
  content: [
    // Enter alternate buffer, hide cursor, clear screen
    { ctrl: 'altBuffer', enable: true },
    { ctrl: 'cursor', hide: true },
    { ctrl: 'clear', mode: 'screen' },
    
    // Position and render content
    { ctrl: 'cursor', to: { row: 1, col: 1 } },
    { text: ' Header ', style: { fg: 'white', bg: 'blue', bold: true } },
    
    { ctrl: 'cursor', to: { row: 3, col: 2 } },
    '• Menu item 1',
    
    { ctrl: 'cursor', to: { row: 4, col: 2 } },
    '• Menu item 2'
  ]
}));

// On exit:
console.log(render({
  content: [
    { ctrl: 'cursor', show: true },
    { ctrl: 'altBuffer', enable: false }
  ]
}));
```

### Progress Bar

```javascript
function progressBar(percent) {
  const width = 30;
  const filled = Math.round(width * percent / 100);
  const empty = width - filled;
  
  return render({
    content: [
      { ctrl: 'cursor', col: 1 },
      { ctrl: 'clear', mode: 'line' },
      '[',
      { text: '█'.repeat(filled), style: { fg: 'green' } },
      { text: '░'.repeat(empty), style: { fg: 'brightBlack' } },
      '] ',
      { text: `${percent}%`, style: { bold: true } }
    ]
  });
}

// Usage
process.stdout.write(progressBar(75));
```

## JSON Schema

A JSON Schema is available at `schemas/ansi-json-v1.schema.json` for validation and editor support.

```json
{
  "$schema": "./node_modules/rettangoli-ansi-json/schemas/ansi-json-v1.schema.json",
  "content": [...]
}
```

## License

MIT
