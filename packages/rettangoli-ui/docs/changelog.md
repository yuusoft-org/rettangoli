# Changelog

## Unreleased

### Breaking Changes
- Disabled attribute standardized to `disabled` (replaces `dis`) on primitives: `rtgl-button`, `rtgl-input`, `rtgl-input-number`, `rtgl-textarea`, `rtgl-slider`, `rtgl-color-picker`.
- Event names standardized to kebab-case with action suffixes:
  - `rtgl-dropdown-menu`: `click-item` → `item-click`
  - `rtgl-navbar`: `clickStart` → `start-click`
  - `rtgl-sidebar`: `headerClick` → `header-click`
  - `rtgl-sidebar`: `itemClick` → `item-click`
- `rtgl-form` inputType values are now kebab-case only:
  - `inputText` → `input-text`
  - `colorPicker` → `color-picker`

Update any event listeners accordingly.
