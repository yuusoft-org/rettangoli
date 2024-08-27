---
layout: documentation.html
title: Gap
tags: [documentation]
---

## Overview

Available attributes:

* Gap: `g`
* Gap Vertical: `gv`
* Gap Horizontal: `gh`

Possible values are: `xs`, `s`, `m`, `l`, `xl`


```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view g="m" d="h" w="160">
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```


```html
<rtgl-view w="f" bgc="isu" p="m" d="h" g="m">
  <rtgl-view gh="xs" gv="l" d="h" w="160">
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
      <rtgl-view wh="48" bgc="su"></rtgl-view>
  </rtgl-view>
</rtgl-view>
```
