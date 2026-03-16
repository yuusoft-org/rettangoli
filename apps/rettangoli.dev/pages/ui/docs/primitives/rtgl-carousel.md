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

## Quickstart

```html codePreview
<rtgl-carousel sw="4/5fb" sna="center" nav pager>
  <rtgl-view w="1fg" h="140" bgc="mu" p="md" br="md">Slide 1</rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="se" p="md" br="md">Slide 2</rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="ac" p="md" br="md">Slide 3</rtgl-view>
  <rtgl-view w="1fg" h="140" bgc="pr" p="md" br="md">Slide 4</rtgl-view>
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
