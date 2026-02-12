# Changelog

## Unreleased

### Improvements
- `rtgl-sidebar`: added `hide-header` to hide the header block.
- `rtgl-sidebar`: supports `bwr` overrides with default `bwr="xs"` so right border can be disabled via `bwr="none"`.
- `rtgl-sidebar`: added `w` width override so values like `w="f"` are supported.

### Breaking Changes
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
