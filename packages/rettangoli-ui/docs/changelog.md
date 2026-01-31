# Changelog

## Unreleased

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

Update any event listeners accordingly.
