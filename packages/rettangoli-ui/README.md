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
You must include a theme stylesheet in your app. See `src/vt/static/public/theme.css` for a reference theme.

---

For development workflows, component architecture, and interface rules, see `DEVELOPMENT.md`.
