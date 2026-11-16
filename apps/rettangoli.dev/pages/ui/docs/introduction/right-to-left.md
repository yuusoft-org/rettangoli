---
template: docs
_bind:
  docs: docs
title: Right-to-Left
tags: documentation
sidebarId: right-to-left
---

Rettangoli UI supports right-to-left languages such as Arabic, Hebrew, Persian and Urdu. Set the direction once on the document and every primitive and component mirrors itself.

## Enabling It

Set `dir="rtl"` on `<html>`:

```html
<html lang="ar" dir="rtl">
```

To switch at runtime, for example when the user changes language, change the same attribute. The page mirrors immediately and open popovers and tooltips move to their new position. No reload or re-render is needed.

```js
document.documentElement.setAttribute("dir", "rtl");
```

Left to right is the default, so a page without `dir` needs no change.

## What `l` and `r` Mean

In Rettangoli attributes, **`l` and `r` mean the start and end of the reading direction**. Under left to right that is left and right. Under right to left they are mirrored. `t` and `b` never change.

| Attribute | Left to right | Right to left |
| --- | --- | --- |
| `ml`, `pl`, `bwl` | left side | right side |
| `mr`, `pr`, `bwr` | right side | left side |
| `mh`, `ph` | both sides | both sides |
| `edge="l"` | pinned to the left | pinned to the right |
| `edge="r"` | pinned to the right | pinned to the left |
| `place="l"`, `ls`, `le` | opens to the left of the anchor | opens to the right |
| `place="r"`, `rs`, `re` | opens to the right of the anchor | opens to the left |
| `place="ts"`, `bs` | extends right from the anchor | extends left |
| `place="te"`, `be` | extends left from the anchor | extends right |
| `ah="s"`, `ta="s"` | left | right |
| `ah="e"`, `ta="e"` | right | left |

So a view written once works in both directions:

```html
<rtgl-view d="h" g="md" pl="lg">
  <rtgl-svg svg="menu" wh="16"></rtgl-svg>
  <rtgl-text>Settings</rtgl-text>
</rtgl-view>
```

Under left to right the padding is on the left and the icon comes first from the left. Under right to left the padding is on the right and the icon comes first from the right.

The attributes map to CSS logical properties: `ml` is `margin-inline-start`, `pr` is `padding-inline-end`, `bwl` is `border-inline-start-width`, and `edge="l"` is `inset-inline-start: 0`.

## What Mirrors

- Horizontal rows (`d="h"`), alignment (`ah`), text alignment (`ta`), and the side attributes in the table above.
- `rtgl-popover` and `rtgl-tooltip` placement, and the panels of `rtgl-select`, `rtgl-tag-select`, `rtgl-popover-input`, `rtgl-color-picker` and `rtgl-dropdown-menu`.
- Arrow keys in `rtgl-tabs`, `rtgl-carousel` and `rtgl-dropdown-menu`: the key that points toward the next item moves to it, so ArrowLeft goes to the next tab.
- `rtgl-carousel` slide order, navigation buttons and pager.
- `rtgl-dialog` close button, which sits at the top left.
- `rtgl-sidebar` border and tooltips, `rtgl-breadcrumb` separators, `rtgl-table` column order, and `rtgl-slider`.

## What Does Not Mirror

- `rtgl-input-number` and `rtgl-input-duration` always show their value left to right, so a minus sign stays in front of the number. The value still lines up with the start edge of the page.
- The color area and hue strip of `rtgl-color-picker`, and `rtgl-waveform`, keep their physical orientation.
- Images, and icons passed to `rtgl-svg`. Mirror a directional icon yourself when it needs it.

## Text the User Types

`rtgl-input` and `rtgl-textarea` take their direction from their content. Hebrew typed into a field on an English page reads right to left, and English typed into a field on an Arabic page reads left to right. An empty field follows the page, so its placeholder is aligned with the rest of the form.

## Keeping a Subtree Physical

Put `dir="ltr"` on an element to keep everything inside it left to right, whatever the page direction. Use it for content that has a fixed physical layout, such as a code sample, a media timeline or a phone number.

```html
<rtgl-view dir="ltr" d="h" g="md">
  <rtgl-text>00:00</rtgl-text>
  <rtgl-waveform w="f" h="48"></rtgl-waveform>
  <rtgl-text>03:10</rtgl-text>
</rtgl-view>
```

`dir="rtl"` on an element works the same way in the other direction.

## Custom CSS

In your own styles, use logical properties so they mirror too: `margin-inline-start` instead of `margin-left`, `inset-inline-end` instead of `right`, and `text-align: start` instead of `text-align: left`. Use `:dir(rtl)` for the cases that need a different rule.
