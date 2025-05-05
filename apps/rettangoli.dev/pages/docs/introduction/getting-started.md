---
layout: core/documentation
title: Getting Started
tags: documentation
---


## Overview

Rettangoli is layout and UI library available in browser environments where web components are supported. It provides a flexible layout system and UI components for building modern web interfaces.

There are two primary ways to use Rettangoli:

* As an Immediately Invoked Function Expression (IIFE)
* As an ESM module

## IIFE Installation

With the IIFE approach, you have two options:

* **rettangoli-layout**: Provides only the basic components
* **rettangoli-ui**: Provides a complete UI library with additional components

### Component Availability

TODO

### Using rettangoli-layout

```html

### Using rettangoli-ui

```html
```

### CSS Installation

In addition to the JavaScript file, you need to add the CSS for styling:

```html
```

For more information on available themes and customization options, see our [CSS Variables](/docs/introduction/css-variables) guide.

## ESM Installation

The ESM approach provides more customization options.

### Install via npm

First, install the package:

```bash
npm install rettangoli-ui
```

Rettangoli uses [uhtml](https://github.com/WebReflection/uhtml) as its HTML rendering library. You'll need to pass instances of `render` and `html` when registering components:

```js
import { render, html } from 'uhtml';
import { RettangoliView, RettangoliText } from 'rettangoli-ui'; 

// Register the web components
customElements.define("rtgl-view", RettangoliView({ render, html }));
customElements.define("rtgl-text", RettangoliText({ render, html }));
// Continue registering all the web components that you need
```

This approach offers several advantages:

* You can customize the names of the web components
* You can use your own instance of `render` and `html`
* You can register only the components you actually need

### CSS Installation for ESM

You'll still need to import a CSS file in your HTML:

```html
<link href="/path/to/theme-dark.css" rel="stylesheet" />
```

## Examples

Check out our complete examples to see Rettangoli in action:

* IIFE Example: TODO
* ESM Example: TODO
* Component Showcase: TODO
