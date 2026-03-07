---
template: docs
_bind:
  docs: docs
title: Tag
tags: documentation
sidebarId: rtgl-tag
---

An inline metadata primitive for statuses, categories, versions, and removable pills.

## Quickstart

Use `rtgl-tag` when you need a compact, semantic surface for short labels:

```html codePreview
<rtgl-view d="h" g="sm" wrap>
  <rtgl-tag>Draft</rtgl-tag>
  <rtgl-tag v="pr">Pro</rtgl-tag>
  <rtgl-tag v="se" pre="text">API</rtgl-tag>
  <rtgl-tag removable value="beta">Beta</rtgl-tag>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Variant | `v` | `mu`, `pr`, `se`, `ac`, `de` | `mu` |
| Size | `s` | `sm`, `md`, `lg` | `md` |
| Prefix Icon | `pre` | registered svg key | - |
| Suffix Icon | `suf` | registered svg key | - |
| Removable | `removable` | boolean | - |
| Remove Payload | `value` | string | - |
| Disabled | `disabled` | boolean | - |
| Width | `w` | number, `%`, `xs`-`xl`, `f`, `1fg`-`12fg`, CSS length/value | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |

Responsive breakpoint prefixes are supported for `v`, `s`, shared surface styling, cursor, and margin attributes.
For full breakpoint behavior, see [Responsiveness](/ui/docs/introduction/responsiveness).

## Variant

Use variants to tune emphasis and tone.

- `mu`: muted/default metadata
- `pr`: strong primary highlight
- `se`: secondary filled tag
- `ac`: accent highlight
- `de`: destructive/error state

```html codePreview
<rtgl-view d="h" g="sm" wrap>
  <rtgl-tag v="mu">Muted</rtgl-tag>
  <rtgl-tag v="pr">Primary</rtgl-tag>
  <rtgl-tag v="se">Secondary</rtgl-tag>
  <rtgl-tag v="ac">Accent</rtgl-tag>
  <rtgl-tag v="de">Blocked</rtgl-tag>
</rtgl-view>
```

## Size

Use `s="sm|md|lg"` to scale compact labels and more prominent badges.

```html codePreview
<rtgl-view d="h" g="sm" wrap av="c">
  <rtgl-tag s="sm">Small</rtgl-tag>
  <rtgl-tag s="md">Medium</rtgl-tag>
  <rtgl-tag s="lg">Large</rtgl-tag>
</rtgl-view>
```

## Icons

Use `pre` and `suf` for icon-enhanced tags.

### Behavior & precedence

- `pre` renders before the label.
- `suf` renders after the label.
- Both can be used together.
- Icon size follows the resolved tag size.

```html codePreview
<rtgl-view d="h" g="sm" wrap>
  <rtgl-tag pre="text">Schema</rtgl-tag>
  <rtgl-tag suf="text" v="se">Preview</rtgl-tag>
  <rtgl-tag pre="text" suf="spinner" v="pr">Building</rtgl-tag>
</rtgl-view>
```

## Removable

Set `removable` to render a trailing remove affordance. Listen for `remove-click` on the host element.

### Behavior & precedence

- The internal remove button dispatches `remove-click`.
- Event detail is `{ value }`.
- `disabled` keeps the tag visible but prevents removal.

```html codePreview
<rtgl-view d="v" g="sm">
  <rtgl-view d="h" g="sm" wrap id="tag-list">
    <rtgl-tag removable value="draft">Draft</rtgl-tag>
    <rtgl-tag removable value="beta" v="pr">Beta</rtgl-tag>
    <rtgl-tag removable value="locked" disabled>Locked</rtgl-tag>
  </rtgl-view>
  <rtgl-text id="tag-result" c="mu-fg">No remove yet</rtgl-text>
</rtgl-view>

<script>
  const tagList = document.getElementById('tag-list');
  const result = document.getElementById('tag-result');

  tagList.addEventListener('remove-click', (event) => {
    event.target.remove();
    result.textContent = `Removed: ${event.detail.value || '(no value)'}`;
  });
</script>
```

## Width

Use `w` when tags need truncation or flexible layout participation.

### Behavior & precedence

- Numeric values are pixels (`w="180"`).
- `%`, spacing tokens (`xs`-`xl`), CSS lengths, and flex-grow values are supported.
- Long labels truncate to one line inside the surface.

```html codePreview
<rtgl-view d="v" g="sm" w="260">
  <rtgl-tag w="f">Full width tag in a constrained column</rtgl-tag>
  <rtgl-tag w="180" v="se">
    This is a longer label that truncates once it reaches the width limit.
  </rtgl-tag>
</rtgl-view>
```

## Gotchas

- `rtgl-tag` is not a link or button primitive; use it for metadata display, not primary actions.
- `removable` only adds the trailing remove affordance. It does not remove the element automatically.
- For truncation, provide `w` or another width-constrained parent.
- Generic surface styling attrs like `bgc`, `c`, `bc`, `bw`, and `shadow` are intentionally not supported; use the built-in tag variants instead.
- Border radius is fixed to `--tag-border-radius` (built-in themes default it to `9999px`); `rtgl-tag` does not support consumer radius overrides.
