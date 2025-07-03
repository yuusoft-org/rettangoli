
# Rettangoli

## Development

### Folder Structure

```
src/
├── primitives/     # Basic web components built from scratch, no dependencies
└── components/     # Pre-built components using @rettangoli/fe
vt/                 # Uses @rettangoli/vt visual testing library
├── reference/      # Golden screenshots for visual testing
└── specs/          # HTML test specifications
```

### Install dependencies

Use npx to install `rtgl` cli globally. You run into issues if try to use `bunx`.

```bash
npx i -g rtgl
```

Install dependencies

```bash
bun install
```

### Generate specification screens

Bundles the code to be used for `rettangoli-vt`

```bash
bun run build:dev
```

Uses `rettangoli-vt` to generates test screens 

```bash
bun run vt:generate
```

Test for any change using `rettangoli-vt`

```bash
bun run vt:report
```

Accept the changes by updating the reference screenshots

```bash
bun run vt:accept
```

You can then access the generates screens

```bash
bun run serve
```

Open http://localhost:3000/view to see the specification screens


## Usage

### Install via CDN

Use via CDN iife (Immediately Invoked Function Expression) us [JSDeliver](https://www.jsdelivr.com/package/npm/@rettangoli/ui)

Primitives only. This might be useful if you want a light weight version and use only the primitives.

```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@latest/dist/rettangoli-layout.iife.min.js"></script>
```

All primitives and components

```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@latest/dist/rettangoli-ui.iife.min.js"></script>
```

### Install via NPM

Install package

```bash
npm install @rettangoli/ui
```

Import the package. This allows you to configure more flexible options and to treeshake only the code that you need.

```js
import { RettangoliView } '@rettangoli/ui';
customElements.define("rtgl-view", RettangoliView({}));
```

### Stylesheet file

Make sure you import a stylesheet file from your html file. [Example](./src/vt/static/public/theme.css)





