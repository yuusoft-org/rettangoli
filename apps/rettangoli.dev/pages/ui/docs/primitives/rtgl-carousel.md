---
template: docs
_bind:
  docs: docs
title: Carousel
tags: documentation
sidebarId: rtgl-carousel
---

A dedicated horizontal carousel primitive for content strips and feature cards.

`rtgl-carousel` manages slide sizing, snapping behavior, and controls while leaving slide content to you.
Desktop mouse dragging is supported for fine-grained navigation, while touch and trackpad use native scrolling.

## Landing-style Hero Carousel

Use `sna="center"` to keep edge slides centered when the carousel first loads.

```html codePreview
<rtgl-carousel sw="4/5fb" sna="center" g="md" nav pager>
  <rtgl-view w="1fg" h="140" bgc="mu" p="md" br="md">
    <rtgl-text f="lg" b="700">Slide 1</rtgl-text>
    <rtgl-text>Discover a centered feature.</rtgl-text>
  </rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="se" p="md" br="md">
    <rtgl-text f="lg" b="700">Slide 2</rtgl-text>
    <rtgl-text>Preview the next section without losing rhythm.</rtgl-text>
  </rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="ac" p="md" br="md">
    <rtgl-text f="lg" b="700">Slide 3</rtgl-text>
    <rtgl-text>Keep interaction natural on mouse and touch.</rtgl-text>
  </rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="pr" p="md" br="md">
    <rtgl-text f="lg" b="700">Slide 4</rtgl-text>
    <rtgl-text>Add your own cards and visuals.</rtgl-text>
  </rtgl-view>
</rtgl-carousel>
```

## Card Rail

`sw` can be a ratio, length, or percentage. This pattern is useful for horizontally scrolling cards.

```html codePreview
<rtgl-carousel sw="320" sna="start" g="md" nav pager>
  <rtgl-card w="1fg" p="md">
    <rtgl-text slot="body" b="700">Pro Plan</rtgl-text>
    <rtgl-text slot="body">$12/mo</rtgl-text>
    <rtgl-button slot="body" v="pr" w="f">Choose</rtgl-button>
  </rtgl-card>
  <rtgl-card w="1fg" p="md">
    <rtgl-text slot="body" b="700">Team Plan</rtgl-text>
    <rtgl-text slot="body">$36/mo</rtgl-text>
    <rtgl-button slot="body" v="se" w="f">Choose</rtgl-button>
  </rtgl-card>
  <rtgl-card w="1fg" p="md">
    <rtgl-text slot="body" b="700">Enterprise</rtgl-text>
    <rtgl-text slot="body">Custom</rtgl-text>
    <rtgl-button slot="body" v="de" w="f">Talk to sales</rtgl-button>
  </rtgl-card>
  <rtgl-card w="1fg" p="md">
    <rtgl-text slot="body" b="700">Starter</rtgl-text>
    <rtgl-text slot="body">$0/mo</rtgl-text>
    <rtgl-button slot="body" v="ol" w="f">Try free</rtgl-button>
  </rtgl-card>
</rtgl-carousel>
```

## Free Scroll

For gallery-like rails, disable snap so users can stop at any point.

```html codePreview
<rtgl-carousel sw="220" sna="start" snap="false" g="lg" nav>
  <rtgl-view w="1fg" h="120" bgc="mu" p="md" br="md">Logo 1</rtgl-view>
  <rtgl-view w="1fg" h="120" bgc="se" p="md" br="md">Logo 2</rtgl-view>
  <rtgl-view w="1fg" h="120" bgc="ac" p="md" br="md">Logo 3</rtgl-view>
  <rtgl-view w="1fg" h="120" bgc="pr" p="md" br="md">Logo 4</rtgl-view>
  <rtgl-view w="1fg" h="120" bgc="mu" p="md" br="md">Logo 5</rtgl-view>
  <rtgl-view w="1fg" h="120" bgc="se" p="md" br="md">Logo 6</rtgl-view>
</rtgl-carousel>
```

## External Controls

Hide built-in arrows and drive the carousel from custom buttons when you need brand-specific controls.

```html codePreview
<rtgl-view g="md">
  <rtgl-carousel id="feature-ribbon" sw="360" nav="false" pager="false" g="md">
    <rtgl-view w="1fg" h="120" bgc="mu" p="md" br="md">Panel one</rtgl-view>
    <rtgl-view w="1fg" h="120" bgc="se" p="md" br="md">Panel two</rtgl-view>
    <rtgl-view w="1fg" h="120" bgc="ac" p="md" br="md">Panel three</rtgl-view>
  </rtgl-carousel>

  <rtgl-view d="h" g="sm">
    <rtgl-button onclick="this.closest('rtgl-view').querySelector('#feature-ribbon').prev()">Prev</rtgl-button>
    <rtgl-button onclick="this.closest('rtgl-view').querySelector('#feature-ribbon').next()">Next</rtgl-button>
  </rtgl-view>
</rtgl-view>
```

```html
<script>
  const ribbon = document.querySelector("#feature-ribbon");
  ribbon.addEventListener("index-change", (event) => {
    console.log("active index", event.detail.index);
  });
</script>
```

## Responsive Setup

Use breakpoint prefixes for different widths and alignment per viewport.

```html codePreview
<rtgl-carousel sw="2/3" g="md" sna="start" sm-sw="1" md-sna="center" md-nav="false">
  <rtgl-view w="1fg" h="140" bgc="mu" p="md" br="md">Mobile first</rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="se" p="md" br="md">Desktop second</rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="ac" p="md" br="md">Desktop third</rtgl-view>
</rtgl-carousel>
```

## Core behavior

`rtgl-carousel` treats direct child elements as slides and styles each one using the resolved slide width.

- `sw` controls slide width (`1/1fb`, `4/5fb`, `320`, `80%`, etc.).
- `sna` accepts `start`, `center`, or `end`.
- when `sna="center"`, extra viewport padding is added so edge slides can stay centered.
- `snap="false"` disables snap and enables free scroll.
- `index` sets the starting or controlled active slide (0-based index).
- `nav` toggles the previous/next arrow controls (`true` by default).
- `pager` toggles bottom dot controls (off by default).

## Attributes

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `index` | number | `0` | 0-based active index |
| `sw` | string | `1/1` | Slide width in ratio or CSS length/percent |
| `sna` | `start`, `center`, `end` | `center` | Slide snap alignment |
| `g` | number, spacing token, CSS length | `md` gap token | Inter-slide gap |
| `spi` | CSS length | `0` | `scroll-padding-inline` |
| `sbh` | string | `smooth` | `scroll-behavior` value |
| `snap` | boolean | `true` | Set to `false` for free scroll behavior |
| `nav` | boolean | `true` | Show/Hide arrow buttons |
| `pager` | boolean | `false` | Show/Hide dot controls |

## Responsive overrides

Any attribute above can be set at breakpoints the same way as other primitives:

```html codePreview
<rtgl-carousel sw="4/5" sna="start" md-sw="1" md-sna="center">
  ...
</rtgl-carousel>
```

## API

- methods
  - `goTo(index)` set an explicit slide
  - `next()` move to next slide
  - `prev()` move to previous slide
- event
  - `index-change` with `detail.index` on current slide changes

## Styling hooks

The shadow DOM exposes style parts for customizations:

- `viewport-shell`
- `viewport`
- `controls`
- `pager`
- `pager-button` / `pager-button-active`
- `nav-button` / `prev-button` / `next-button`

Use `::part(...)` selectors from the host page to adjust spacing, colors, or button visibility.
