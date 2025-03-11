---
layout: documentation.html
title: Links
tags: [documentation]
---

The `<rtgl-button>` component can function as a link while maintaining the appearance of a button, providing a consistent UI for both actions and navigation.

## Link Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `href` | URL | Makes the button act as a link to the specified URL |
| `target` | `_blank`, `_self`, etc. | Specifies where to open the linked document |

## Basic Usage

### Button as a Link

To make a button function as a link, simply add the `href` attribute:

```html
<rtgl-button href="/some-page" t="p">Go to Page</rtgl-button>
```

This creates a button that navigates to the specified URL when clicked, while maintaining the visual appearance of a button.

### Opening Links in a New Tab

Add the `target` attribute to control how the link opens:

```html
<rtgl-button href="https://example.com" target="_blank" t="p">External Link</rtgl-button>
```

This creates a button that opens the link in a new tab when clicked.
