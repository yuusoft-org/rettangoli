---
template: docs
_bind:
  docs: docs
title: Text
tags: documentation
sidebarId: rtgl-text
---

A typography primitive for rendering labels, headings, body copy, truncated text, and linkable text surfaces.

## Quickstart

Use this baseline pattern in most UIs:

- Use `s` for hierarchy (`h3`, `lg`, `sm`, etc.).
- Use `c="mu"` for secondary/supporting copy.
- Use `w` with `ellipsis` when text must stay on one line.

```html codePreview
<rtgl-view d="v" g="sm" w="f">
  <rtgl-text s="h3">Billing Settings</rtgl-text>
  <rtgl-text c="mu">Manage invoices, payment methods, and tax details.</rtgl-text>
  <rtgl-text w="220" ellipsis>
    This is a long line that stays to one line and truncates when it exceeds the available width.
  </rtgl-text>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Size | `s` | `xs`, `sm`, `md`, `lg`, `h4`, `h3`, `h2`, `h1` | `md` |
| Color | `c` | `fg`, `mu`, `pr`, `se`, `de`, `ac`, `bg`, `bo`, `tr`, `pr-fg`, `se-fg`, `de-fg`, `mu-fg`, `ac-fg` | `fg` |
| Text Align | `ta` | `s`, `c`, `j`, `e` | `s` |
| Width | `w` | number, `%`, `xs`-`xl`, `f`, `1fg`-`12fg`, CSS length/value | - |
| Ellipsis | `ellipsis` | boolean | - |
| Link | `href`, `new-tab`, `rel` | string, boolean | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |

Responsive breakpoint prefixes are supported for style attributes such as `s`, `c`, `ta`, and margin attributes.
For full breakpoint behavior, see [Responsiveness](/ui/docs/introduction/responsiveness).

## Size

Control text scale using predefined sizes from `xs` to heading levels.

```html codePreview
<rtgl-view d="v" g="sm">
  <rtgl-text s="h1">Heading 1</rtgl-text>
  <rtgl-text s="h2">Heading 2</rtgl-text>
  <rtgl-text s="h3">Heading 3</rtgl-text>
  <rtgl-text s="h4">Heading 4</rtgl-text>
  <rtgl-text s="lg">Large</rtgl-text>
  <rtgl-text s="md">Medium (default)</rtgl-text>
  <rtgl-text s="sm">Small</rtgl-text>
  <rtgl-text s="xs">Extra Small Text</rtgl-text>
</rtgl-view>
```

## Color

Use semantic tokens for predictable contrast and theme consistency.

| Token | Meaning |
| --- | --- |
| `fg` | Default foreground text |
| `mu` / `mu-fg` | Muted/supporting text |
| `pr`, `se`, `de`, `ac` | Primary, secondary, destructive, accent text |
| `pr-fg`, `se-fg`, `de-fg`, `ac-fg` | Foreground variants for strong emphasis |
| `bg`, `bo`, `tr` | Background, border, transparent |

```html codePreview
<rtgl-view d="v" g="sm">
  <rtgl-text c="fg">Default foreground text</rtgl-text>
  <rtgl-text c="mu">Muted text</rtgl-text>
  <rtgl-text c="pr">Primary text</rtgl-text>
  <rtgl-text c="de">Destructive text</rtgl-text>
  <rtgl-view bgc="pr" p="sm">
    <rtgl-text c="bg">Text on strong background</rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Text Alignment

Control alignment with `ta="s|c|j|e"`.

```html codePreview
<rtgl-view d="v" g="md">
  <rtgl-view bgc="mu" p="md" w="300">
    <rtgl-text ta="s">Start aligned text.</rtgl-text>
  </rtgl-view>
  <rtgl-view bgc="mu" p="md" w="300">
    <rtgl-text ta="c">Center aligned text.</rtgl-text>
  </rtgl-view>
  <rtgl-view bgc="mu" p="md" w="300">
    <rtgl-text ta="j">Justified text stretches each line to fill the row width.</rtgl-text>
  </rtgl-view>
  <rtgl-view bgc="mu" p="md" w="300">
    <rtgl-text ta="e">End aligned text.</rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Width

Control text width with fixed size, stretch, or proportional flex-grow.

### Behavior & precedence

- Numeric values are pixels (`w="240"`).
- `%`, spacing tokens (`xs`-`xl`), and CSS lengths are supported.
- `w="f"` stretches to available width.
- `w="1fg"`-`w="12fg"` uses proportional flex-grow in flex layouts.

```html codePreview
<rtgl-view d="h" g="md" w="f">
  <rtgl-view w="120" bgc="mu" p="sm">
    <rtgl-text>Fixed</rtgl-text>
  </rtgl-view>
  <rtgl-view w="1fg" bgc="mu" p="sm">
    <rtgl-text>Flexible 1</rtgl-text>
  </rtgl-view>
  <rtgl-view w="2fg" bgc="mu" p="sm">
    <rtgl-text>Flexible 2</rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Ellipsis

Truncate overflowing text on a single line.

### Behavior & precedence

- `ellipsis` applies single-line truncation.
- For predictable truncation, combine `ellipsis` with `w` or another width-constrained parent.
- If no width constraint exists, text may not truncate.
- No shorthand alias is supported; use `ellipsis` explicitly.

```html codePreview
<rtgl-view d="v" g="md">
  <rtgl-view bgc="mu" p="md" g="sm">
    <rtgl-text w="180">
      Text without ellipsis may wrap or overflow depending on context
    </rtgl-text>
    <rtgl-text ellipsis w="180">
      Text with ellipsis truncates this line when it exceeds the available width
    </rtgl-text>
  </rtgl-view>
</rtgl-view>
```

## Link

Use `href` to make the text surface clickable. Use `new-tab` and `rel` for navigation behavior.

### Behavior & precedence

- `href` turns the text surface into a link target.
- `new-tab` opens the destination in a new tab.
- `rel` is forwarded to the generated link element.
- If `new-tab` is set and `rel` is omitted, `rel="noopener noreferrer"` is applied.
- Avoid mixing host-level `href` with nested `<a>` inside the same `rtgl-text`.

### Inline Anchor Link

```html codePreview
<rtgl-view d="v" g="sm">
  <rtgl-text>
    Learn more in the <a href="/docs">documentation</a>.
  </rtgl-text>
</rtgl-view>
```

### Clickable Text Surface

```html codePreview
<rtgl-view d="v" g="sm">
  <rtgl-text href="#local-section">Local navigation</rtgl-text>
  <rtgl-text href="https://rettangoli.dev" new-tab rel="noopener noreferrer">
    External navigation
  </rtgl-text>
</rtgl-view>
```

## Rich Text

Use standard inline HTML tags inside `rtgl-text` for emphasis and semantics.

```html codePreview
<rtgl-view d="v" g="sm">
  <rtgl-text>Text with <b>bold</b>, <i>italic</i>, and <code>code</code>.</rtgl-text>
  <rtgl-text>Use <mark>mark</mark>, <del>delete</del>, and <ins>insert</ins> as needed.</rtgl-text>
</rtgl-view>
```

## Gotchas

- `ta` start token is `s` (not `sm`).
- `ellipsis` is single-line truncation.
- For full-surface link behavior, use host `href`; for inline links, use nested `<a>` without host `href`.
