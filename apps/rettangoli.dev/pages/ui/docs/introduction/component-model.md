---
template: documentation
title: Component Model
tags: documentation
sidebarId: component-model
---

How Rettangoli UI is structured and how to keep interfaces consistent.

## Primitive vs Component

### Primitive

A primitive is a low-level building block (`rtgl-view`, `rtgl-text`, `rtgl-input`, and similar).

Use primitives when you need:
- predictable low-level behavior
- reusable layout/styling tokens
- small API surfaces

### Component

A component is an opinionated workflow composition built with `@rettangoli/fe` (`rtgl-form`, `rtgl-select`, `rtgl-sidebar`, and similar).

Use components when you need:
- complete interaction patterns
- richer data contracts (`items`, `form`, `options`, and similar)
- consistent higher-level events

## Design Goals

Rettangoli favors consistency over one-off convenience.

- one mental model for attrs, props, and events
- attrs in `kebab-case`, props in `camelCase`, events in `kebab-case`
- value events are consistent: `value-input` (live), `value-change` (commit)
- responsive attrs use `sm-`, `md-`, `lg-`, `xl-`
- tokens are reused rather than introducing ad-hoc variants

## Consistency Guidelines

- attrs map to props (`selected-value` -> `selectedValue`)
- direct property value takes precedence over attr fallback
- do not bind the same prop using both `name=value` and `:name=value` on one node
- prefer props for data/state, attrs for layout/styling
- keep established shorthand attrs where they already exist (`w`, `h`, `wh`, `m*`, `op`, and similar)
- keep descriptive attrs explicit in kebab-case when clarity is better (`new-tab`, `no-wrap`, `ellipsis`, `shadow`)
- do not introduce alias attrs for the same behavior

## API Quality Rules

- each public attr should be documented in the related primitive/component page
- avoid no-op attrs: if an attr is accepted, it should change behavior or rendering
- attrs intended for runtime toggling should update behavior after mount
- if an attr is responsive, related runtime behavior should follow the same responsive model
- event behavior should be predictable; when an event does not bubble, document it explicitly
- keep cross-primitive semantics aligned (for example lifecycle/reset attrs such as `key`)

For responsive behavior, see [Responsiveness](./responsiveness.md).

## Components and Feature Scope

| Component | Primary Role | Core Features |
| --- | --- | --- |
| `rtgl-accordion-item` | toggled content section | collapsible state, label/content/slot |
| `rtgl-breadcrumb` | hierarchical navigation | item list, collapse by max items, separator icon, `item-click` |
| `rtgl-dropdown-menu` | contextual menu overlay | positioned menu, item/label/separator rows, close + item events |
| `rtgl-form` | schema-driven form workflow | field schema, defaults, actions, `form-change` and `action-click` |
| `rtgl-global-ui` | app-level interaction layer | alert/confirm/dropdown flows with promise-like API |
| `rtgl-navbar` | top navigation shell | configurable start area, right slot, start click event |
| `rtgl-page-outline` | document section tracking | target and scroll container linkage, active offset |
| `rtgl-popover-input` | inline popover editing | popover value editing, value events |
| `rtgl-select` | single-choice select | options, selected value, `no-clear`, add-option action |
| `rtgl-sidebar` | sidebar navigation | header plus grouped items, selected state, item/header events |
| `rtgl-slider-input` | numeric dual control | synchronized slider + number input, min/max/step |
| `rtgl-table` | tabular data display | column/row model, header sort event, row click event |
| `rtgl-tabs` | segmented selection | tab items, selected tab, item click event |
| `rtgl-tooltip` | contextual hint | controlled open/position/place/content |

## Primitive Families

- Layout and display: `rtgl-view`, `rtgl-text`, `rtgl-image`, `rtgl-svg`, `rtgl-button`
- Inputs: `rtgl-input`, `rtgl-input-number`, `rtgl-textarea`, `rtgl-slider`, `rtgl-color-picker`
- Overlays: `rtgl-popover`, `rtgl-dialog`

If behavior falls outside these families or component scopes, document the rationale in the relevant primitive/component docs before implementation.
