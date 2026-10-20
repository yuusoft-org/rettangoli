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

## Icons and Default Text

Set up icons and replace the library's built-in English text with three functions. With the script-tag bundles, they are on `window.rtgl`, which exists once the Rettangoli script has run, so call them in a script after it. With npm, import them from `@rettangoli/ui`:

```html
<script src="https://cdn.jsdelivr.net/npm/@rettangoli/ui@1.29.0/dist/rettangoli-iife-ui.min.js"></script>
<script>
  rtgl.setIcons({
    text: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12H20" stroke="currentColor" stroke-width="2"/></svg>`,
  });
  rtgl.setUiMessages({
    selectPlaceholder: "Sélectionnez une option",
    carouselGoTo: "Aller à la diapositive {value}",
  });
  rtgl.setFormMessages({
    required: "Ce champ est obligatoire",
  });
</script>
```

```js
import {
  DEFAULT_UI_MESSAGES,
  setFormMessages,
  setIcons,
  setUiMessages,
} from "@rettangoli/ui";
```

- `setIcons(icons)` adds or replaces icons by name for `rtgl-svg`. Icons registered earlier stay registered, and `rtgl-svg` elements already on the page redraw.
- `setUiMessages(messages)` replaces the text components and primitives show when you pass none. Components already on the page redraw; global UI dialogs that are already open keep their text. A message marks inserted values with `{name}`, as in the table below.
- `setFormMessages(messages)` replaces the default form validation messages (see `rtgl-form`). Forms use them from their next validation.
- `setUiMessages` and `setFormMessages` replace the previous messages, so call them again with the new language when it changes, or with `{}` to go back to English. A key that is not set, or is an empty string, keeps the English default, and text you pass to a component, such as a `placeholder` or `aria-label`, still takes precedence.
- `DEFAULT_UI_MESSAGES` holds every key with its English default, for building translation files.
- `window.rtglIcons` and `window.rtglFormMessages` still work but are deprecated. Values set with the functions take precedence over them. Unlike the functions, they can be set before the Rettangoli script loads, which is why `rtgl ui build-svg` still writes `window.rtglIcons`.

| Key | English default | Where it appears |
| --- | --- | --- |
| `addOption` | Add | The "+ Add" option of select and segmented control |
| `carouselGoTo` | Go to slide {value} | Carousel page dot label, with `{value}` for the slide number |
| `carouselNext` | Next slide | Carousel next button label |
| `carouselPrevious` | Previous slide | Carousel previous button label |
| `colorPickerChoose` | Choose color | Color picker panel label |
| `colorPickerHex` | Hex color | Color picker hex field label |
| `colorPickerHue` | Hue | Color picker hue strip label |
| `colorPickerSaturationBrightness` | Saturation and brightness | Color picker saturation and brightness area label |
| `colorPickerSaturationBrightnessValue` | Saturation {saturation}%, brightness {brightness}% | Its value text, with `{saturation}` and `{brightness}` |
| `dialogCancel` | Cancel | Global UI cancel button |
| `dialogClose` | Close dialog | Dialog close button label |
| `dialogConfirm` | Yes | Global UI confirm dialog button |
| `dialogOk` | OK | Global UI alert and component dialog confirm button |
| `formImagePlaceholder` | No Image | Form image field placeholder |
| `formSectionAction` | Section action | Form section action button label |
| `menu` | Menu | Dropdown menu label |
| `popoverInputSubmit` | Submit | Popover input submit button |
| `segmentedControl` | Segmented control | Segmented control label |
| `selectClear` | Clear selection | Select clear button label |
| `selectNoMatches` | No matching options | Select search with no results |
| `selectPlaceholder` | Select an option | Select placeholder |
| `selectSearchPlaceholder` | Search options | Select search field placeholder |
| `tableEmpty` | No data available | Table with no rows |
| `tabs` | Tabs | Tabs label |
| `tagRemove` | Remove tag | Tag remove button label |
| `tagSelectAddOption` | Add tag | Tag select add option in the popover |
| `tagSelectAdded` | Added | Tag select suffix on added options |
| `tagSelectEmpty` | No tags available | Tag select popover with no options |
| `tagSelectPlaceholder` | Add tag | Tag select trigger placeholder |
| `tagSelectSave` | Save | Tag select save button |
