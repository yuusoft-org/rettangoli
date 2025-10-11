---
layout: core/documentation
title: Getting Started
tags: documentation
---


## Overview

The simplest way to use rettangoli-ui is import directly from CDN. For example:

```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@0.1.7/dist/rettangoli-iife-ui.min.js"></script>
```

This will setup all the web components.

## CSS Installation

In addition to the JavaScript file, you need to add the CSS for styling:

```html
<link href="/public/theme.css" rel="stylesheet">
```

For more information on available themes and customization options, see our [CSS Variables](/docs/introduction/css-variables) guide.

## Advanced usage

The ESM approach provides more customization options.

### Install via npm

First, install the package:

```bash
npm install @rettangoli/ui
```

Then you can impornt the components and define custom elements on your own.
This method allows for more flexibility if you need customizations

For example

```js
import { RettangoliButton } from '@rettangoli/ui'
customElements.define("rtgl-button", RettangoliButton({}));
```

