
# Rettangoli

Rettangoli UI is a framework based on webcomponents.

Example:

```html
<rtgl-button>Hello</rtgl-button>
```

## Use attribute based rather than class based

❌ Normally you would do like this:

```html
<rtgl-view class="sm pr"></rtgl-view>
```


✅ what we do

We shortcut almost everything.

```html
<rtgl-view s="sm" v="pr"></rtgl-view>
```


## Optimized for SPA

❌ Normally you would do like this:

```html
<rtgl-select>
  <rtgl-option value="option-1">Option 1</rtgl-option>
  <rtgl-option value="option-2">Option 2</rtgl-option>
  <rtgl-option value="option-3">Option 3</rtgl-option>
  <rtgl-option value="option-4">Option 4</rtgl-option>
  <rtgl-option value="option-5">Option 5</rtgl-option>
  <rtgl-option value="option-6">Option 6</rtgl-option>
</rtgl-select>
```

In rettangoli UI you do it like this:

✅ what we do

```html
<rtgl-select items="uriEncoded([{"value": "options-1", "label": "Option 1"}])">
</rtgl-select>
```

OR equivalent

```html
<script>
  const select = document.createElement('rtgl-select')
  select.items = [{"value": "options-1", "label": "Option 1"}]
  document.append(select)
</script>

```

Why? This is more optimized for SPAs, where you can control the data in javascript rather than html, much easier to do.

For SSR, can use the template tag to actually insert the final rendered content

```html
<rtgl-select items="uriEncoded([{"value": "options-1", "label": "Option 1"}])">
  <template>
    <rtgl-view><rtgl-text>Option 1</rtgl-text></rtgl-view>
    ...
  </template>
</rtgl-select>
```

## Props vs Attributes

Each element will first check props and then attributes if prop value was not found. Attribute will:

- will conver to JSON if is json. json values for attributes is always expected to be URIEncoded
- for boolean values, will automatically conver true to true and everything else to false
- **Attribute names are typically 1-4 characters** for brevity (e.g., `w`, `h`, `bgc`, `m`, `p`, `d`)



## Required SVGs

need to import a js file to set svgs


## Accessibility

We have not looked at this yet, will plan to do this later on

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





