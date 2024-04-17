# rettangoli-ui

> [!WARNING]
> This library is still in experimental mode. Expect API and UI breaking changes to happen without prior announcement.

Rettangoli is a UI library with following characteristics

* it uses flexbox
* implemented in web components
* designed to be used for UI editors such as rettangoli-editor


| Component | Component                             | Description                                                                  |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------- |
| `<rtgl-view>`      | [View](#rtgl-view)                  | Building block to build layouts                                       |
| `<rtgl-button>`    | [Button](#rtgl-button)              | Buttons                                       |
| `<rtgl-text>`      | [Text](#rtgl-text)                  | Text                                       |
| `<rtgl-image>`     | [Image](#rtgl-image)                | Image                                       |
| `<rtgl-svg>`       | [SVG](#rtgl-svg)                    | SVG                                       |
| `<rtgl-form>`      | [Form](#rtgl-form)                  | Forms                                       |


## rtgl-view

The `rtgl-view` component offers a variety of attributes for extensive customization. Below are detailed tables for each attribute category.

| Attribute | Meaning                             | Values                                                                  |
| --------- | ----------------------------------- | ----------------------------------------------------------------------- |
| `w`       | [Width](#dimensions)                  | custom                                                              |
| `h`       | [Height](#dimensions)                 | custom                                                                |
| `wh`      | [Width and Height](#dimensions)       | custom                                                                |
| `d`       | [Direction](#direction)               | `h`, `v`                                                              |
| `ah`      | [Align Horizontal](#alignment)        | `s`, `c`, `e`                                                         |
| `av`      | [Align Vertical](#alignment)          | `s`, `c`, `e`                                                         |
| `as`      | [Align Self](#alignment)              | `sch`, `s`, `c`, `e`                                                  |
| `f`       | [Flex](#flex)                         | `1`, `0`                                                              |
| `fw`      | [Flex Wrap](#flex-wrap)               | `w`                                                                   |
| `g`       | [Flex Gap](#flex-gap)                 | `xs`, `s`, `m`, `l`, `xl`                                             |
| `gh`      | [Flex Gap Horizontal](#flex-gap)      | `xs`, `s`, `m`, `l`, `xl`                                             |
| `gv`      | [Flex Gap Vertical](#flex-gap)        | `xs`, `s`, `m`, `l`, `xl`                                             |
| `m`       | [Margin](#margin)                     | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mh`      | [Margin Horizontal](#margin)          | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mv`      | [Margin Vertical](#margin)            | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mt`      | [Margin Top](#margin)                 | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mr`      | [Margin Right](#margin)               | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mb`      | [Margin Bottom](#margin)              | `xs`, `s`, `m`, `l`, `xl`                                             |
| `ml`      | [Margin Left](#margin)                | `xs`, `s`, `m`, `l`, `xl`                                             |
| `p`       | [Padding](#padding)                   | `xs`, `s`, `m`, `l`, `xl`                                             |
| `ph`      | [Padding Horizontal](#padding)        | `xs`, `s`, `m`, `l`, `xl`                                             |
| `pv`      | [Padding Vertical](#padding)          | `xs`, `s`, `m`, `l`, `xl`                                             |
| `pt`      | [Padding Top](#padding)               | `xs`, `s`, `m`, `l`, `xl`                                             |
| `pr`      | [Padding Right](#padding)             | `xs`, `s`, `m`, `l`, `xl`                                             |
| `pb`      | [Padding Bottom](#padding)            | `xs`, `s`, `m`, `l`, `xl`                                             |
| `pl`      | [Padding Left](#padding)              | `xs`, `s`, `m`, `l`, `xl`                                             |
| `bgc`     | [Background Color](#background-color) | `p`, `pc`, `s`, `sc`, `e`, `ec`, `su `, `sucl`, `suc`, `such`         |
| `br`      | [Border Radius](#border-radius)       | `xs`, `s`, `m`, `l`, `xl`                                             |
| `bw`      | [Border Width](#border-width)         | `xs`, `s`, `m`, `l`, `xl`                                             |
| `bc`      | [Border Color](#border-color)         | `p`, `pc`, `s`, `sc`, `e`, `ec`, `su`, `sucl`, `suc`, `such`          |
| `h-cur`   | [Hover Cursor](#hover-cursor)         | `p` |

### Dimensions

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `w`     | Width            |                                |
| `h`     | Heigh            |                                |
| `wh`    | Width and Height | Will set both width and height |

#### Values

Values can bet set to any number. Can postfix the unit, otherwise it will default to `px`

#### Examples

Sets width and height to 120px

```html
<rtgl-view wh="120"></rtgl-view>
<rtgl-view wh="120px"></rtgl-view>
<rgtl-view w="120" h="120"></rtgl-view>
<rgtl-view w="120px" h="120px"></rtgl-view>
```

Can also use other units

```html
<rtgl-view width="100vw" height="100vh"></rtgl-view>
```


### Direction

#### Attributes

| Attribute | Meaning    | Description                    |
| --------- | ---------- | ------------------------------ |
| `d`     | Direction    | Children items will be oredred horizotannly or vertically |

#### Values

| Value | Meaning   |
| ----- | --------  |
| `v` | Vertical    |
| `h` | Horizontal  |

### Alignment

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `ah`     | Align Horizontal  | Horizontally align child items |
| `av`     | Align Vertical    | Vertically align child items   |
| `as`     | Align Self        | How to align self   |

#### Values

| Value | Meaning | Default |
| ----- | ------- | ------- |
|     | none      | Yes     |
| `s` | start     |         |
| `c` | center    |         |
| `e` | end       |         |


Only available for Align Self

| Value | Meaning | Default |
| ----- | ------- | ------- |
| `sch`  | Stretch |        |


#### Examples

```html
<rtgl-view ah="c"></rtgl-view>
<rtgl-view ah="e"></rtgl-view>
<rtgl-view av="c"></rtgl-view>
<rtgl-view av="e"></rtgl-view>
```


### Flex

#### Attribute

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `flex`     | Flex  | Flex grow and shirink |

#### Values

| Value    | Meaning |
| -------- | ------- |
| `0`    | 0       |
| `1`    | 1       |
| `none` | none    |

#### Examples

```html
<rtgl-view flex="1"></rtgl-view>
<rtgl-view flex="2"></rtgl-view>
<rtgl-view flex="3"></rtgl-view>
```

### Flex Wrap

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `fw`     | Flex Wrap  | Flex wrap or no wrap |

#### Values

| Value | Meaning |
| ----- | ------- |
| `w` | wrap    |

#### Examples

```html
<rtgl-view fw="w"></rtgl-view>
```

### Flex Gap

#### Attributes

| Attribute | Meaning             | Description                           |
| --------- | ------------------- | ------------------------------------- |
| `g`       | Flex Gap            | Flex Gap both horizontal and vertical |
| `gh`      | Flex Gap Horizontal | Flex Gap Horizontal                   |
| `gv`      | Flex Gap Vertical   | Flex Gap Vertical                     |

#### Values

| Value  | Meaning     |
| ------ | ----------- |
| `xs` | Extra small |
| `s`  | Small       |
| `m`  | Medium      |
| `l`  | Large       |
| `xl` | Extra large |

#### Examples

```html
<rtgl-view g="m"></rtgl-view>
<rtgl-view gh="m" gv="m"></rtgl-view>
```


### Margin

#### Attributes

| Attribute | Meaning           | Description                     |
| --------- | ----------------- | ------------------------------- |
| `m`      | Margin             | Sets margin in all 4 directions |
| `mh`     | Margin Horizontal  | Sets left and right margin      |
| `mv`     | Margin Vertical    | Sets top and bottom margin      |
| `mt`     | Margin Top         |                                 |
| `ml`     | Margin Left        |                                 |
| `mb`     | Margin Bottom      |                                 |
| `mr`     | Margin Right       |                                 |


#### Values

| Value  | Meaning     |
| ------ | ----------- |
| `xs` | Extra small |
| `s`  | Small       |
| `m`  | Medium      |
| `l`  | Large       |
| `xl` | Extra large |

#### Examples


```html
<rtgl-view m="m"></rtgl-view>
<rtgl-view mh="m" mv="m"></rtgl-view>
<rtgl-view mt="m" mr="m" mb="m" ml="m"></rtgl-view>
```


### Padding

#### Attributes

| Attribute | Meaning           | Description                     |
| --------- | ----------------- | ------------------------------- |
| `p`      | Padding             | Sets padding in all 4 directions |
| `ph`     | Padding Horizontal  | Sets left and right padding      |
| `pv`     | Padding Vertical    | Sets top and bottom padding      |
| `pt`     | Padding Top         |                                 |
| `pl`     | Padding Left        |                                 |
| `pb`     | Padding Bottom      |                                 |
| `pr`     | Padding Right       |                                 |

#### Values

| Value  | Meaning     |
| ------ | ----------- |
| `xs` | Extra small |
| `s`  | Small       |
| `m`  | Medium      |
| `l`  | Large       |
| `xl` | Extra large |

#### Examples

```html
<rtgl-view p="m"></rtgl-view>
<rtgl-view ph="m" pv="m"></rtgl-view>
<rtgl-view pt="m" pr="m" pb="m" pl="m"></rtgl-view>
```


### Background Color

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `bgc`     | Background Color | Background Color |


#### Values

| Value   | Meaning               |
| ------- | --------------------- |
| `p`   | primary               |
| `pc`  | primary-container     |
| `s`   | secondary             |
| `sc`  | secondary container   |
| `e`   | error                 |
| `ec`  | error-container       |
| `su`   | surface               |
| `sucl` | surface container low |
| `suc`  | surface container     |
| `such` | suface container high |

#### Examples

TODO

### Border Radius

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `br`      | Border Radius    | Border Radius  |

#### Values

| Value  | Meaning     |
| ------ | ----------- |
| `xs` | Extra small |
| `s`  | Small       |
| `m`  | Medium      |
| `l`  | Large       |
| `xl` | Extra large |

#### Examples

TODO

### Border Width

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `bw`      | Border Width     | Border Width  |

#### Values

| Value  | Meaning     |
| ------ | ----------- |
| `xs` | Extra small |
| `s`  | Small       |
| `m`  | Medium      |
| `l`  | Large       |
| `xl` | Extra large |

#### Examples

TODO

### Border Color

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `bc`      | Border Color    | Border Color  |

#### Values

| Value   | Meaning               |
| ------- | --------------------- |
| `p`   | primary               |
| `pc`  | primary-container     |
| `s`   | secondary             |
| `sc`  | secondary container   |
| `e`   | error                 |
| `ec`  | error-container       |
| `s`   | surface               |
| `scl` | surface container low |
| `sc`  | surface container     |
| `sch` | suface container high |

#### Examples

TODO

### Hover Cursor


#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `h-cur`      | Hover Cursor | Hover Cursor |

#### Values

| Value   | Meaning               |
| ------- | --------------------- |
| `p`   | Pointer |

#### Examples

TODO

## rtgl-button

The `rtgl-button` provides basic styling for buttons

| Attribute | Meaning                               | Values                                                                  |
| --------- | ------------------------------------  | ----------------------------------------------------------------------- |
| `t`       | [Type](#type)                         | `p`, `pl`, `ps`, `s`, `sl`, `ss`, `e`, `el`                             |
| `f`       | [Flex](#flex)                         | `1`, `0`                                                              |
| `as`      | [Align Self](#alignment)              | `sch`, `s`, `c`, `e`                                                  |
| `m`       | [Margin](#margin)                     | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mh`      | [Margin Horizontal](#margin)          | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mv`      | [Margin Vertical](#margin)            | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mt`      | [Margin Top](#margin)                 | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mr`      | [Margin Right](#margin)               | `xs`, `s`, `m`, `l`, `xl`                                             |
| `mb`      | [Margin Bottom](#margin)              | `xs`, `s`, `m`, `l`, `xl`                                             |
| `ml`      | [Margin Left](#margin)                | `xs`, `s`, `m`, `l`, `xl`                                             |


### Type

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `t`      | Type    | Provides type combinations for different sizes and color styles  |

#### Values

| Value   | Meaning               |
| ------- | --------------------- |
| `p`    | Primary                |
| `pl`   | Primary Large          |
| `ps`   | Primary Small          |
| `s`    | Secondary              |
| `sl`   | Secondary Large        |
| `ss`   | Secondary Small        |
| `e`    | Error                  |
| `el`   | Error Large            |
| `es`   | Error Small            |


## rtgl-text

The `rtgl-text` provides text in standard sizes and colors

| Attribute | Meaning                               | Values                                                                           |
| --------- | ------------------------------------  | -------------------------------------------------------------------------------- |
| `s`       | [Size](#size)                         | `dm`, `hm`, `tl`, `tm`, `ts`, `bl`, `bm`, `bs`, `ll`, `lm`                       |
| `c`       | [Color](#color)                       | `on-p`, `on-pc`, `on-s` , `on-sc`, `on-su`, `on-suv`, `i-on-s`, `on-e`, `on-ec`  |
| `f`       | [Flex](#flex)                         | `1`, `0`                                                                         |
| `as`      | [Align Self](#alignment)              | `sch`, `s`, `c`, `e`                                                  |
| `m`       | [Margin](#margin)                     | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mh`      | [Margin Horizontal](#margin)          | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mv`      | [Margin Vertical](#margin)            | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mt`      | [Margin Top](#margin)                 | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mr`      | [Margin Right](#margin)               | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mb`      | [Margin Bottom](#margin)              | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `ml`      | [Margin Left](#margin)                | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `h-cur`   | [Hover Cursor](#hover-cursor)         | `p` |


### Size

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `s`      | Size    | Text sizes  |

#### Values

| Value   | Meaning            |
| ------- | ------------------ |
| `dm`    | Display Medium     |
| `hm`    | Headline Medium    |
| `tl`    | Title Large        |
| `tm`    | Title Medium       |
| `ts`    | Title Small        |
| `bl`    | Body Large         |
| `bm`    | Body Medium        |
| `bs`    | Body Small         |
| `ll`    | Label Large        |
| `lm`    | Label Medium       |

#### Examples

TODO

### Color

#### Attributes

| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `c`       | Color            | Text color                     |


#### Values

| Value      | Meaning                |
| ---------- | ---------------------- |
| `on-p`     | On Primary             |
| `on-pc`    | On Primary Container   |
| `on-s`     | On Secondary           |
| `on-sc`    | On Secondary Container |
| `on-su`    | On Surface             |
| `on-suv`   | on Surface Variant     |
| `i-on-s`   | Inverse on surface     |
| `on-e`     | On Error               |
| `on-ec`    | On Error Container     |

#### Examples

TODO

## rtgl-image

Displays images


| Attribute | Meaning                               | Values                                                                           |
| --------- | ------------------------------------  | -------------------------------------------------------------------------------- |
| `w`       | [Width](#dimensions)                  | custom                      |
| `h`       | [Height](#dimensions)                 | custom                                              |
| `wh`      | [Width and Height](#dimensions)       | custom                                                       |
| `src`     | [Source](#source)                     | custom                                             |
| `of`      | [Object Fit](#object-fit)             | `cov`, `con`                                       |
| `f`       | [Flex](#flex)                         | `1`, `0`                                                                         |
| `as`      | [Align Self](#alignment)              | `sch`, `s`, `c`, `e`                                                  |
| `m`       | [Margin](#margin)                     | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mh`      | [Margin Horizontal](#margin)          | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mv`      | [Margin Vertical](#margin)            | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mt`      | [Margin Top](#margin)                 | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mr`      | [Margin Right](#margin)               | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mb`      | [Margin Bottom](#margin)              | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `ml`      | [Margin Left](#margin)                | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `h-cur`   | [Hover Cursor](#hover-cursor)         | `p` |



### Source

#### Attributes
| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `src`       | Source | Same as standard `<img src="">`  |

#### Values

Should be a url to a remote or local image


#### Examples

TODO


### Object Fit

#### Attributes
| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `of`       | Object Fit | |

#### Values

| Value      | Meaning                |
| ---------- | ---------------------- |
| `cov`     | Cover |
| `con`   | Contain |

#### Examples

TODO

## rtgl-svg

| Attribute | Meaning                               | Values                                                                           |
| --------- | ------------------------------------  | -------------------------------------------------------------------------------- |
| `w`       | [Width](#dimensions)                  | custom                      |
| `h`       | [Height](#dimensions)                 | custom                                              |
| `wh`      | [Width and Height](#dimensions)       | custom                                                       |
| `svg`     | [SVG](#svg)                           | custom                                             |
| `f`       | [Flex](#flex)                         | `1`, `0`                                                                         |
| `m`       | [Margin](#margin)                     | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `as`      | [Align Self](#alignment)              | `sch`, `s`, `c`, `e`                                                  |
| `mh`      | [Margin Horizontal](#margin)          | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mv`      | [Margin Vertical](#margin)            | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mt`      | [Margin Top](#margin)                 | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mr`      | [Margin Right](#margin)               | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `mb`      | [Margin Bottom](#margin)              | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `ml`      | [Margin Left](#margin)                | `xs`, `s`, `m`, `l`, `xl`                                                        |
| `h-cur`   | [Hover Cursor](#hover-cursor)         | `p` |

### SVG

#### Attributes
| Attribute | Meaning          | Description                    |
| --------- | ---------------- | ------------------------------ |
| `svg`       | SVG            |                                |

#### Values

Name of the svg
All names must be registered with global window variable:

```js
window.rtglSvgs = {
    'svgName1': '<svg>...</svg>',
    'svgName2': '<svg>...</svg>'
}
```

#### Examples

```html
<rtgl-svg svg="svgName1"></rtgl-svg>
```

## rtgl-form

TODO
