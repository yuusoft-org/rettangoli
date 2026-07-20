# Changelog

## Unreleased

### Improvements

- `rtgl-view` and `rtgl-grid`: all `sh` / `sv` surfaces now keep native scrolling mechanics while using Rettangoli's sole thin overlay visual. The browser-painted rail is hidden; the arrowless overlay reserves no gutter, stays hidden at rest, appears on mouse hover, supports thumb dragging, and honors `hsb` as always hidden.
- `rtgl-segmented-control`: added reactive `s="sm|md|lg"` size presets at 24px, 32px, and 40px plus `sq` for square segments and icon-only square add actions; the default remains `s="md"`.
- `rtgl-segmented-control`: added icon-only options using registered `svg` keys and accessible `ariaLabel` names while preserving label-only options.
- `rtgl-segmented-control`: added optional per-item `tooltip` text that appears when an option is hovered.
- `rtgl-form`: rejects unsafe, bracket-style, and reserved field paths without mutating prototypes; preserves invalid-path errors during reactive validation; and keeps conditional value pruning safe with frozen store state.
- `rtgl-dialog`: added `bare` mode for consumer-owned modal visuals while preserving native modality, focus containment, and close requests.
- `rtgl-dialog`: keeps sequential keyboard focus inside the modal across slotted and open-shadow content instead of allowing focus to fall back to the page body at a tab boundary.
- `rtgl-dialog`: fixed the open animation so adaptive centering is applied before the first paint, preventing the dialog from jumping from a top-biased position into the centered final state.
- `rtgl-sidebar`: added `type: "divider"` rows for horizontal separators and `type: "spacer"` rows for pushing trailing actions to the bottom of the sidebar.
- `rtgl-tooltip`: added tooltip size presets via `s="sm|md|lg"` and removed the fixed minimum width so content can size more naturally.
- `rtgl-sidebar`: added optional compact-mode hover tooltips and now prefers item `label` while still supporting deprecated `title` as a fallback.
- `rtgl-sidebar`: compact tooltip toggle now uses `tooltip`, with deprecated `showCompactTooltip` / `show-compact-tooltip` aliasing retained for compatibility.
- `rtgl-popover`: overlay layering now uses a higher fixed z-index so tooltips and popovers are less likely to render behind app content.
- `rtgl-select`: tightened dropdown menu spacing and typography, flattened option row corners, and allowed popover content padding overrides so select menus can be styled more precisely without changing every popover.
- `rtgl-form`: fixed embedded `select` field bindings so option arrays and default selections reach child `rtgl-select` instances again, and added VT coverage that opens the select list before screenshot capture.
- added `rtgl-carousel`, a dedicated slotted carousel primitive with exact smooth scrolling, desktop mouse drag, native touch/trackpad scrolling, built-in arrow controls by default, opt-in pager dots, `snap="false"` support for free-scroll rails, and centered edge padding when `sna="center"` so the first and last slides can rest centered.
- `rtgl-view` and `rtgl-image`: added responsive `ar` / `*-ar` support for raw CSS `aspect-ratio` values such as `1`, `1.618`, and `16/9`.
- `rtgl-view`: added raw CSS passthrough background attrs `bgi`, `bgs`, `bgp`, and `bgr` with responsive variants.
- `rtgl-view`: added responsive scroll and carousel passthrough attrs `sst`, `sna`, `sns`, `sbh`, `spi`, and `stg` for `scroll-snap-type`, `scroll-snap-align`, `scroll-snap-stop`, `scroll-behavior`, `scroll-padding-inline`, and `scroll-target-group`.
- added `rtgl-tag`, an inline metadata primitive with variants, icons, truncation, and optional `remove-click` affordance.
- `rtgl-sidebar`: added `hide-header` to hide the header block.
- `rtgl-sidebar`: supports `bwr` overrides with default `bwr="xs"` so right border can be disabled via `bwr="none"`.
- `rtgl-sidebar`: added `w` width override so values like `w="f"` are supported.
- `rtgl-global-ui`: added `showFormDialog({ form, defaultValues?, context?, disabled?, size? })` for embedding `rtgl-form` in the global dialog flow.
- `rtgl-global-ui`: added `showComponentDialog({ component, props?, title?, description?, size?, actions? })` for custom stateful dialog bodies with shell-owned footer actions, required `validate()` / `getValues()` body methods, and promise rejection on body method errors.
- `rtgl-global-ui`: added `showToast({ message })` for stacked top-center toast messages that auto-dismiss after 3 seconds.
- `rtgl-global-ui`: alert/confirm/dialog close paths now resolve pending promise-based flows on overlay dismiss and `closeAll()`.
- `rtgl-form`: added native temporal field types `input-date`, `input-time`, and `input-datetime` with min/max validation.
- `rtgl-form`: re-seeds internal values when the component `key` changes so reopen/remount flows pick up fresh `defaultValues`, including boolean `select` defaults.
- `rtgl-input`: now supports native `date`, `time`, and `datetime-local` types with additional picker affordance styling.
- added standalone temporal primitives `rtgl-input-date`, `rtgl-input-time`, and `rtgl-input-datetime`.
- `rtgl-checkbox`: fixed a label synchronization loop that could trigger repeated `slotchange` updates when used by `rtgl-form` checkbox fields.

### Breaking Changes

- `rtgl-view` and `rtgl-grid` scrolling surfaces now establish a positioning context for their overlay scrollbar when `pos` is otherwise unset; absolutely positioned children therefore resolve against the scrolling host. Explicit responsive `pos` values continue to control the host's own positioning mode.
- Disabled attribute standardized to `disabled` (replaces `dis`) on primitives: `rtgl-button`, `rtgl-input`, `rtgl-input-number`, `rtgl-textarea`, `rtgl-slider`, `rtgl-color-picker`.
- Event names standardized to kebab-case with action suffixes:
  - `rtgl-dropdown-menu`: `click-item` → `item-click`
  - `rtgl-navbar`: `clickStart` → `start-click`
  - `rtgl-sidebar`: `headerClick` → `header-click`
  - `rtgl-sidebar`: `itemClick` → `item-click`
- Value events normalized to `value-input` (live) and `value-change` (commit):
  - `rtgl-input`: `input-change` → `value-input` (adds `value-change` on native `change`)
  - `rtgl-input-number`: `input-change` → `value-input` (adds `value-change` on native `change`)
  - `rtgl-textarea`: `textarea-change` → `value-input` (adds `value-change` on native `change`)
  - `rtgl-slider`: `slider-input` → `value-input`, `slider-change` → `value-change`
  - `rtgl-color-picker`: `colorpicker-input` → `value-input`, `colorpicker-change` → `value-change`
  - `rtgl-popover-input`: `temp-input-change` → `value-input`, `input-change` → `value-change`
  - `rtgl-slider-input`: `slider-input-value-change` → `value-input` / `value-change`
  - `rtgl-select`: `option-selected` / `select-change` → `value-change`, `add-option-selected` → `add-option-click`
- `rtgl-form` inputType values are now kebab-case only:
  - `inputText` → `input-text`
  - `colorPicker` → `color-picker`
- `rtgl-view` wrap API changed:
  - `fw="wrap"` removed
  - use boolean attributes `wrap` and `no-wrap` (including responsive variants like `sm-wrap` / `sm-no-wrap`)
- Link API changed for `rtgl-view`, `rtgl-text`, `rtgl-image`, and `rtgl-button`:
  - `target` removed
  - use boolean `new-tab` instead (keep `rel` for advanced behavior)
- Item link API changed for `rtgl-breadcrumb` and `rtgl-dropdown-menu`:
  - item field `target` removed
  - use boolean `newTab` instead (keep `rel` for advanced behavior)
- Cursor shorthand values removed:
  - `cur="p"` removed
  - `cur="m"` removed
  - use explicit CSS cursor values like `cur="pointer"` and `cur="move"`
- Popover place API changed across overlays:
  - `placement` removed; use `place`
  - supported values changed to short tokens:
    - `t`, `ts`, `te`, `r`, `rs`, `re`, `b`, `bs`, `be`, `l`, `ls`, `le`
  - impacts:
    - `rtgl-popover` attribute
    - `rtgl-tooltip` attribute/property
    - `rtgl-dropdown-menu` attribute/property
    - `showDropdownMenu({ place })` in `rtgl-global-ui`

Update any event listeners accordingly.
