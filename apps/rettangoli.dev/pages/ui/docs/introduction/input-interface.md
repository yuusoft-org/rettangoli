---
template: documentation
title: Input Interface
tags: documentation
sidebarId: input-interface
---

Shared contract for input primitives.

For library-wide guidance, see [Component Model](./component-model.md).

## Goals

- Keep the interface consistent across input primitives.
- Use abbreviated attrs/values where they are already established.
- Keep primitive-specific behavior explicit and minimal.

## Shared Interface

These attrs/events should stay consistent across all input primitives:

| Name | Attr / Event | Type |
| --- | --- | --- |
| Value | `value` | primitive-specific payload |
| Placeholder | `placeholder` | string |
| Disabled | `disabled` | boolean |
| Size | `s` | `sm`, `md` |
| Events | `value-input`, `value-change` | `{ value: ... }` |
| Dimensions | `w`, `h`, `wh` | number, `%`, `xs`-`xl`, `f`, CSS length/value |
| Margin | `m`, `mt`, `mr`, `mb`, `ml`, `mv`, `mh` | `xs`, `sm`, `md`, `lg`, `xl` |
| Cursor | `cur` | cursor token |
| Visibility | `hide`, `show` | boolean |
| Opacity | `op` | `0`-`1` |
| Z-index | `z` | number |

## Primitive Differences

### `rtgl-input`

- Primary purpose: text-like entry.
- Event payload:
  - `value-input` -> `{ value: string }`
  - `value-change` -> `{ value: string }`
- Extra attr: `type` supports only `password` override (default is text).

### `rtgl-input-number`

- Primary purpose: numeric entry.
- Event payload:
  - `value-input` -> `{ value: number | null }`
  - `value-change` -> `{ value: number | null }`
- Numeric attrs: `min`, `max`, `step`.
- Numeric clamping behavior is owned by this primitive.

## Abbreviation Rules

- Prefer existing abbreviated attrs: `s`, `w`, `h`, `wh`, `m*`, `cur`, `op`, `z`.
- Keep semantic/native attrs explicit for readability and intent:
  - `value`, `placeholder`, `disabled`
  - `type` (password override), `min`/`max`/`step` (number)
- Do not add aliases for the same meaning.

## Contract Notes

- If behavior is shared, document it once here and reference from primitive pages.
- If behavior is primitive-specific, document it only in that primitive page.
