---
template: docs
_bind:
  docs: docs
title: Getting Started
tags: documentation
sidebarId: getting-started
---


## Overview

The simplest way to use rettangoli-ui is import directly from CDN. For example:

```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.11/dist/rettangoli-iife-ui.min.js"></script>
```

This will setup all the web components.

## CSS Installation

In addition to the JavaScript file, you must add two CSS files in this order:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.11/dist/themes/base.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.11/dist/themes/theme-rtgl-slate.css">
```

`base.css` is required for base HTML normalization. Then choose one theme file.

For more information on available themes and customization options, see our [CSS Variables](/ui/docs/introduction/css-variables) guide.

## Advanced usage

The ESM approach provides more customization options.

### Install via npm

First, install the package:

```bash
npm install @rettangoli/ui
```

Then you can import the components and define custom elements on your own.
This method allows for more flexibility if you need customizations

For example

```js
import { RettangoliButton } from '@rettangoli/ui'
customElements.define("rtgl-button", RettangoliButton({}));
```

## Default Text

Components show built-in English text when you pass none, such as a select's `Select an option` placeholder or a dialog's `Close dialog` label. To replace it everywhere, for example with translations, set `window.rtglUiMessages`:

```html
<script>
  window.rtglUiMessages = {
    selectPlaceholder: "Sélectionnez une option",
    dialogCancel: "Annuler",
  };
</script>
```

- Keys: `selectPlaceholder`, `selectSearchPlaceholder`, `selectNoMatches`, `selectClear`, `addOption`, `tagSelectPlaceholder`, `tagSelectAdded`, `tagSelectSave`, `tagSelectEmpty`, `tagRemove`, `segmentedControl`, `tabs`, `menu`, `dialogOk`, `dialogConfirm`, `dialogCancel`, `dialogClose`, `formImagePlaceholder`, `formSectionAction`, `popoverInputSubmit`, `tableEmpty`, `carouselPrevious`, `carouselNext`.
- Text you pass to a component, such as a `placeholder` or `aria-label`, still takes precedence.
- A key that is not set, or is an empty string, keeps the English default.
- Components read the object when they render. Set it before they mount; after replacing it, components already shown update on their next render.
- For form validation messages, use `window.rtglFormMessages` (see `rtgl-form`).
