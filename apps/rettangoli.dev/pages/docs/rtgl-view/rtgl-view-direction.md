---
layout: documentation.html
title: Direction
tags: [documentation]
---

## Overview

Available attributes:

* Direction: `d`

### Direction: `d`

By default, layout is vertical. Add `d="h"` to make it horizontal. `h` is the only value that `d` Supports

Vertical
```html
<rtgl-view w="f" bgc="isu" p="m" g="m">
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
</rtgl-view>
```

Horizontal
```html
<rtgl-view w="f" bgc="isu" p="m" g="m" d="h">
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
  <rtgl-view wh="24" bgc="suc"></rtgl-view>
</rtgl-view>
```

## Note

`d="v"` is not supported. For vertical do not set `d` attribute

