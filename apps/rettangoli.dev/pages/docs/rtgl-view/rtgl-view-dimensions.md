---
layout: documentation.html
title: Dimensions
tags: [documentation]
---

## Overview

Available attributes:

* Width and Height: `wh`
* Width: `w`
* Height: `h`

### Width and Height: `wh`

Sets both the width and height of the view. The view will essentially be a square dimension.

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
  <rtgl-view wh="48" bgc="suc"></rtgl-view>
  <rtgl-view wh="64" bgc="suc"></rtgl-view>
  <rtgl-view wh="96" bgc="suc"></rtgl-view>
</rtgl-view>
```

### Width and Height: `w`, `h`

Set width and height separatedly. 

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view w="24" h="48" bgc="suc"></rtgl-view>
  <rtgl-view w="48" h="24" bgc="suc"></rtgl-view>
  <rtgl-view w="64" h="24" bgc="suc"></rtgl-view>
  <rtgl-view w="24" h="96" bgc="suc"></rtgl-view>
</rtgl-view>
```

### Notes

* If the value of the attribute is an umber, the unit will default to `px`
* It supports custom unit such as `100vw`, `100wh`
* Value can be `f` which will fill the entire dimension.

Example of using value `f`

```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m" h="100">
  <rtgl-view w="f" h="f" bgc="suc"></rtgl-view>
</rtgl-view>
```




