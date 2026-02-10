---
template: documentation
title: Getting Started
tags: documentation
sidebarId: getting-started
---


## Overview

The simplest way to use rettangoli-ui is import directly from CDN. For example:

```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.0.0-rc3/dist/rettangoli-iife-ui.min.js"></script>
```

This will setup all the web components.

## CSS Installation

In addition to the JavaScript file, you must add two CSS files in this order:

```html
<link href="/public/reset.css" rel="stylesheet">
<link href="/public/theme-default.css" rel="stylesheet">
```

`reset.css` is required for base HTML normalization. Then choose one theme file.

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
