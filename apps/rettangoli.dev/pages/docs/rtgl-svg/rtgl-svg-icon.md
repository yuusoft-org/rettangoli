---
layout: documentation.html
title: Icon
tags: [documentation]
---

# SVG Icons

The `<rtgl-svg>` component uses the `svg` attribute to reference and display SVG icons that have been defined in your application.

## Icon Attribute

| Attribute | Values | Description |
|-----------|--------|-------------|
| `svg` | Icon name | References the SVG icon by name from the available icons |

## Setting Up Icons

Before using the `<rtgl-svg>` component, you need to define your SVG icons. There are two primary methods to make icons available:

### 1. Using the global `rtglIcons` object

The most common approach is to define icons globally in your HTML or JavaScript:

```html
<script>
  window.rtglIcons = {
    'home': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M23.121,9.069,15.536,1.483a5.008,5.008,0,0,0-7.072,0L.879,9.069A2.978,2.978,0,0,0,0,11.19v9.817a3,3,0,0,0,3,3H21a3,3,0,0,0,3-3V11.19A2.978,2.978,0,0,0,23.121,9.069ZM15,22.007H9V18.073a3,3,0,0,1,6,0Zm7-1a1,1,0,0,1-1,1H17V18.073a5,5,0,0,0-10,0v3.934H3a1,1,0,0,1-1-1V11.19a1.008,1.008,0,0,1,.293-.707L9.878,2.9a3.008,3.008,0,0,1,4.244,0l7.585,7.586A1.008,1.008,0,0,1,22,11.19Z"/></svg>',
    'menu': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3,8H21a1,1,0,0,0,0-2H3A1,1,0,0,0,3,8Zm18,8H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Zm0-5H3a1,1,0,0,0,0,2H21a1,1,0,0,0,0-2Z"/></svg>',
    'settings': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.32,9.55l-1.89-.63.89-1.78A1,1,0,0,0,20.13,6L18,3.87a1,1,0,0,0-1.15-.19l-1.78.89-.63-1.89A1,1,0,0,0,13.5,2h-3a1,1,0,0,0-.95.68L8.92,4.57,7.14,3.68A1,1,0,0,0,6,3.87L3.87,6a1,1,0,0,0-.19,1.15l.89,1.78-1.89.63A1,1,0,0,0,2,10.5v3a1,1,0,0,0,.68.95l1.89.63-.89,1.78A1,1,0,0,0,3.87,18L6,20.13a1,1,0,0,0,1.15.19l1.78-.89.63,1.89a1,1,0,0,0,.95.68h3a1,1,0,0,0,.95-.68l.63-1.89,1.78.89A1,1,0,0,0,18,20.13L20.13,18a1,1,0,0,0,.19-1.15l-.89-1.78,1.89-.63A1,1,0,0,0,22,13.5v-3A1,1,0,0,0,21.32,9.55ZM20,12.78l-1.2.4A2,2,0,0,0,17.64,16l.57,1.14-1.1,1.1L16,17.64a2,2,0,0,0-2.79,1.16l-.4,1.2H11.22l-.4-1.2A2,2,0,0,0,8,17.64l-1.14.57-1.1-1.1L6.36,16A2,2,0,0,0,4,13.82l-1.2-.4V11.22l1.2-.4A2,2,0,0,0,6.36,8L5.79,6.89l1.1-1.1L8,6.36A2,2,0,0,0,10.82,4l.4-1.2h1.56l.4,1.2A2,2,0,0,0,16,6.36l1.14-.57,1.1,1.1L17.64,8a2,2,0,0,0,1.16,2.79l1.2.4ZM12,8a4,4,0,1,0,4,4A4,4,0,0,0,12,8Zm0,6a2,2,0,1,1,2-2A2,2,0,0,1,12,14Z"/></svg>'
  }
</script>
```

### 2. Using the static `addIcon` method

You can also add icons programmatically using JavaScript:

```javascript
// Add a single icon
RettangoliSvg.addIcon('home', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>');

// Add multiple icons
const icons = {
  'menu': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>',
  'settings': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">...</svg>'
};

Object.entries(icons).forEach(([name, svg]) => {
  RettangoliSvg.addIcon(name, svg);
});
```

## Usage Examples

### Basic Icon Usage

Once your icons are defined, you can use them in your HTML:

```html
<rtgl-svg svg="home"></rtgl-svg>
<rtgl-svg svg="menu"></rtgl-svg>
<rtgl-svg svg="settings"></rtgl-svg>
```

### Icon with Styling

Combine the `svg` attribute with other styling attributes:

```html
<rtgl-svg svg="home" wh="32" f="p"></rtgl-svg>
```

## Best Practices

### SVG Format

For best results, use SVG icons that:

1. Have a defined `viewBox` attribute
2. Use `currentColor` for fills and strokes to enable color customization
3. Are optimized for web use (remove unnecessary metadata)

### Icon Naming

Use a consistent naming convention for your icons:

- Use lowercase names
- Use hyphens for multi-word names (e.g., `arrow-left`)
- Group related icons with prefixes (e.g., `nav-home`, `nav-settings`)

### Icon Libraries

You can use popular icon libraries by converting them to the format expected by `rtgl-svg`:

```javascript
// Example: Converting Material Icons to rtglIcons format
fetch('https://example.com/material-icons.json')
  .then(response => response.json())
  .then(icons => {
    Object.entries(icons).forEach(([name, svg]) => {
      RettangoliSvg.addIcon(name, svg);
    });
  });
``` 