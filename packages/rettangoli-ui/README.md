# Rettangoli UI

A UI component library built on Web Components with attribute-first styling.

## Quickstart

### CDN (iife)
Primitives only (lightweight):
```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@latest/dist/rettangoli-layout.iife.min.js"></script>
```

Primitives + components:
```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@latest/dist/rettangoli-ui.iife.min.js"></script>
```

### NPM (ESM)
```bash
npm install @rettangoli/ui
```

```js
import { RettangoliView } from '@rettangoli/ui';
customElements.define('rtgl-view', RettangoliView({}));
```

### Minimal usage
```html
<rtgl-view p=md g=sm>
  <rtgl-text>Hello</rtgl-text>
  <rtgl-button>Click</rtgl-button>
</rtgl-view>
```

### Stylesheet
You must load two CSS files in this order:

```html
<link rel="stylesheet" href="node_modules/@rettangoli/ui/src/themes/reset.css">
<link rel="stylesheet" href="node_modules/@rettangoli/ui/src/themes/theme-default.css">
```

`reset.css` is required for base HTML normalization. Then choose exactly one theme file.

Available prebuilt themes:

- `src/themes/theme-default.css`
- `src/themes/theme-catppuccin.css`

---

For development workflows, component architecture, and interface rules, see `DEVELOPMENT.md`.
