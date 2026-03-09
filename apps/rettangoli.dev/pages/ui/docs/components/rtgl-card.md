---
template: docs
_bind:
  docs: docs
title: Card
tags: documentation
sidebarId: rtgl-card
---

A structured content surface with a standardized shell, optional head/desc header, and default body slot.

## Quickstart

Use `head`, `desc`, and `size` to keep card rhythm consistent.

```html codePreview
<rtgl-card
  head="Billing settings"
  desc="Manage invoices, payment methods, and tax details."
  size="md"
  w="420">
  <rtgl-view d="v" g="md">
    <rtgl-text>
      Update billing contacts, invoice recipients, and VAT information from one card surface.
    </rtgl-text>
    <rtgl-view d="h" g="sm" wrap>
      <rtgl-button v="pr">Open billing</rtgl-button>
      <rtgl-button v="gh">View invoices</rtgl-button>
    </rtgl-view>
  </rtgl-view>
</rtgl-card>
```

## API

| Name | Attribute / Property | Type | Default |
| --- | --- | --- | --- |
| Heading | `head` | string | - |
| Description | `desc` | string | - |
| Size | `size` | `sm`, `md`, `lg` | `md` |
| Body Slot | default slot | any content | - |

## Behavior

### Behavior & precedence

- `head` and `desc` render a standardized card header region.
- If both are omitted, the card renders body content only.
- `size` controls internal card padding, header gap, and header-to-body rhythm.
- The card shell is fixed in v1; host attrs that would override the shell surface are ignored.
- Outer layout attrs like `w`, `h`, and margin attrs can still position the card in a layout.

## Sizes

| Size | Intent |
| --- | --- |
| `sm` | Compact support cards and denser utility surfaces |
| `md` | Default balanced card for most UI surfaces |
| `lg` | More prominent summaries and roomier content blocks |

```html codePreview
<rtgl-view d="h" g="lg" wrap w="f">
  <rtgl-card size="sm" head="Small" desc="Compact rhythm." w="240">
    <rtgl-text s="sm">Good for denser UI blocks.</rtgl-text>
  </rtgl-card>

  <rtgl-card size="md" head="Medium" desc="Balanced default." w="260">
    <rtgl-text s="sm">Good for most settings and summary cards.</rtgl-text>
  </rtgl-card>

  <rtgl-card size="lg" head="Large" desc="Roomier hierarchy." w="300">
    <rtgl-text s="sm">Good for more prominent summaries and content surfaces.</rtgl-text>
  </rtgl-card>
</rtgl-view>
```

## Body Content

The default slot is the card body.

For predictable spacing inside the body, wrap multiple children in a `rtgl-view` and set `g` there.

```html codePreview
<rtgl-card head="Body wrapper pattern" desc="Recommended for multi-block content." w="420">
  <rtgl-view d="v" g="md">
    <rtgl-text>
      The card enforces shell spacing and header rhythm. Your body wrapper should own internal content spacing.
    </rtgl-text>
    <rtgl-view bgc="mu" p="md" br="md">
      <rtgl-text s="sm">Nested box</rtgl-text>
    </rtgl-view>
  </rtgl-view>
</rtgl-card>
```

## Gotchas

- `head` / `desc` own the header typography; do not recreate that structure manually unless you intentionally want a body-only card.
- `size` changes the shell rhythm, not just a single padding value.
- The body slot does not automatically add gap between multiple sibling children; use a wrapper `rtgl-view g="..."` when you need internal body rhythm.
