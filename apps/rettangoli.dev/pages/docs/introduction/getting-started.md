---
layout: documentation.html
title: Getting Started
tags: [documentation]
---

## Overview

Minimal to get started

```
<script src="https://cdn.jsdelivr.net/npm/rettangoli-ui@0.0.8-rc1/dist/rettangoli-ui.min.js"></script>
<link href="/public/theme-dark.css" rel="stylesheet" />
```

We provide 3 ways to use rettangoli

### rettangoli-layout
Contains `rtgl-view`, `rtgl-image`, `rtgl-text`, `rtgl-svg` and `rtgl-button`.
You can use this if your webpage is about presentation and does not have any interactive or asking input from users.

```
<script src="https://cdn.jsdelivr.net/npm/rettangoli-layout@0.0.8-rc1/dist/rettangoli-layout.min.js"></script>
```

### rettangoli-ui
Contains everything from `rettangoli-layout` and all elements required for user input, and also some floating elements. it is more heavy.

```
<script src="https://cdn.jsdelivr.net/npm/rettangoli-ui@0.0.8-rc1/dist/rettangoli-ui.min.js"></script>
```

### Custom

`npm i rettangoli-ui`

```js
import { RettangoliView, RettangoliText } from 'rettangoli-ui'; 
customElements.register(RettangoliView.wcName, RettangoliView)
```

Then run 

`esbuild ...`

And you will be able to use the min file

```
<script src="path/toyourjsfile.js"></script>
```

Note during esbuild, it will download uhtml which is a dependency for rettangoli

### CSS Theme file

You will need a theme file to define the CSS variables for the libray to work correctly.

Dark mode
```
<link href="/public/theme-dark.css" rel="stylesheet" />
```

Light mode
```
<link href="/public/theme-light.css" rel="stylesheet" />
```

Please edit the CSS file to match you own design needs.


### Full Example

```


<script src="https://cdn.jsdelivr.net/npm/rettangoli-ui@0.0.8-rc1/dist/rettangoli-ui.min.js"></script>
<link href="/public/theme-dark.css" rel="stylesheet" />

```

