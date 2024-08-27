---
layout: documentation.html
title: Align
tags: [documentation]
---

## Overview

Available attributes:

* Align Vertical: `av`
* Align Horizontal: `ah`

### Align Vertical: `av`

By default, elements will be aligned to the top.

### Align Horizontal: `av`

By default, elements will be aligned to the left.


### Example

There are 9 combination of alignment in total. Below is an example of all of them

```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="100" bgc="suc" p="m">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" ah="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" ah="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="100" bgc="suc" p="m" av="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="c" ah="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="c" ah="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="100" bgc="suc" p="m" av="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="e" ah="c">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
  <rtgl-view wh="100" bgc="suc" p="m" av="e" ah="e">
    <rtgl-view wh="24" bgc="isu"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```

