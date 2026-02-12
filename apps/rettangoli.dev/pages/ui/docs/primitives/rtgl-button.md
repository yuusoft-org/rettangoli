---
template: documentation
title: Button
tags: documentation
sidebarId: rtgl-button
---

A primary action primitive for commands, navigation actions, and icon-trigger controls.

## Quickstart

Use this as your default action button:

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button v="pr" s="md">Save Changes</rtgl-button>
  <rtgl-button v="ol" s="md">Cancel</rtgl-button>
</rtgl-view>
```

## Core Decisions

### Choose Action Type

| Intent | Recommended |
| --- | --- |
| Run an in-page action | `rtgl-button` without `href` |
| Navigate to another route/url | `rtgl-button` with `href` |

### Choose Content Mode

| Intent | Recommended |
| --- | --- |
| Text button | Label as slot content |
| Icon + text button | `pre` or `suf` with label |
| Icon-only trigger | `sq` + `pre` |

### Responsive Syntax (At a Glance)

Breakpoint prefixes are supported for `v`, `s`, and margin attributes.
For full behavior details, see [Responsiveness](/ui/docs/introduction/responsiveness).

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button v="pr" sm-v="ol" s="lg" sm-s="sm">Responsive Action</rtgl-button>
</rtgl-view>
```

## Attributes

| Name | Attribute | Type | Default |
| --- | --- | --- | --- |
| Variant | `v` | `pr`, `se`, `de`, `ol`, `gh`, `lk` | `pr` |
| Size | `s` | `sm`, `md`, `lg` | `md` |
| Prefix Icon | `pre` | registered svg key | - |
| Suffix Icon | `suf` | registered svg key | - |
| Square Mode | `sq` | boolean | - |
| Disabled | `disabled` | boolean | - |
| Link | `href`, `new-tab`, `rel` | string, boolean | - |
| Width | `w` | number, `%`, `xs`-`xl`, `f`, CSS length/value | - |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` | - |

## Variant

Control the visual style and emphasis of buttons to match their importance and context.

- `pr`: Primary action
- `se`: Secondary action
- `de`: Destructive action
- `ol`: Outline action
- `gh`: Ghost action
- `lk`: Link-style action

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button v="pr">Primary</rtgl-button>
  <rtgl-button v="se">Secondary</rtgl-button>
  <rtgl-button v="de">Destructive</rtgl-button>
  <rtgl-button v="ol">Outline</rtgl-button>
  <rtgl-button v="gh">Ghost</rtgl-button>
  <rtgl-button v="lk">Link</rtgl-button>
</rtgl-view>
```

## Size

Control the button scale with `sm`, `md`, and `lg`.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button s="sm">Small</rtgl-button>
  <rtgl-button s="md">Medium</rtgl-button>
  <rtgl-button s="lg">Large</rtgl-button>
</rtgl-view>
```

## Icons

Use `pre` and `suf` to place icons before or after the label.

### Behavior & precedence

- `pre` renders a leading icon.
- `suf` renders a trailing icon.
- You can use both in one button.
- Icon size follows the button size (`s`).

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button pre="text">Leading Icon</rtgl-button>
  <rtgl-button suf="text">Trailing Icon</rtgl-button>
  <rtgl-button pre="text" suf="spinner">Both Icons</rtgl-button>
</rtgl-view>
```

## Square

Use `sq` for icon-only square buttons.

### Behavior & precedence

- `sq` produces square dimensions based on `s`.
- When `sq` is set, `w` is ignored.
- Pair `sq` with `pre` for a visible icon.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button sq pre="text"></rtgl-button>
  <rtgl-button sq pre="text" s="sm"></rtgl-button>
  <rtgl-button sq pre="text" s="lg"></rtgl-button>
</rtgl-view>
```

## Width

Control width with fixed values or stretch mode.

### Behavior & precedence

- Numeric values are pixels (`w="180"`).
- `%`, spacing tokens (`xs`-`xl`), and CSS length values are supported.
- `w="f"` stretches to available width.
- `w` is ignored when `sq` is set.

```html codePreview
<rtgl-view g="md" w="300">
  <rtgl-button w="f">Full Width</rtgl-button>
  <rtgl-button w="180">Fixed Width</rtgl-button>
</rtgl-view>
```

## Disabled

Use `disabled` when an action is temporarily unavailable.

### Behavior & precedence

- Disabled buttons are non-interactive.
- If both `disabled` and `href` are present, disabled behavior wins.

```html codePreview
<rtgl-button disabled>Disabled</rtgl-button>
```

## Link

Use `href` for navigation-style actions.

### Behavior & precedence

- `href` turns the button into a navigation action.
- `new-tab` opens the destination in a new tab.
- `rel` configures relationship/security metadata.
- If `new-tab` is set and `rel` is omitted, `rel="noopener noreferrer"` is applied.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button href="#overview" v="ol">Go to Overview</rtgl-button>
  <rtgl-button
    href="https://rettangoli.dev"
    new-tab
    rel="noopener noreferrer"
    v="lk"
  >
    Open Site
  </rtgl-button>
</rtgl-view>
```

## Margin

Add external spacing with margin tokens.

```html codePreview
<rtgl-view d="h" g="md">
  <rtgl-button mr="md">Button A</rtgl-button>
  <rtgl-button>Button B</rtgl-button>
</rtgl-view>
```
