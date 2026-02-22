# Rettangoli TUI Roadmap

This roadmap is the planning source for `packages/rettangoli-tui`.

## Priority Tags

- `[P0]` Critical: runtime correctness, crashes, interaction blockers
- `[P1]` Important: UX quality, composability, developer ergonomics
- `[P2]` Backlog: enhancements and optional capabilities

## Priorities

1. `[P0][DONE]` Stabilize interactive terminal runtime
- raw mode input loop
- alternate-screen lifecycle
- quit key handling
- safe suspend/resume for external editor flows

2. `[P0][DONE]` Keep FE contract parity for component authoring
- `.schema.yaml`, `.view.yaml`, `.store.js`, `.handlers.js` contract alignment
- runtime schema validation and prop normalization consistency

3. `[P0][DONE]` Support native terminal primitives for real workflows
- `rtgl-view`, `rtgl-text`, `rtgl-input`, `rtgl-textarea`
- `rtgl-divider` (horizontal + vertical)
- imperative global dialog service (`deps.ui.dialog`) with form-style payload
- `rtgl-list` and `rtgl-table` with row highlight support

4. `[P1][DONE]` Reduce flicker in interactive mode
- replace full-screen clears with incremental line updates
- redraw only changed rows and stale overlay rows

5. `[P1]` Expand keyboard interaction model
- table/list page scrolling for long datasets
- richer key maps (`home/end`, `page up/down`)
- optional keybinding presets

6. `[P1]` Improve primitive theming controls
- semantic color tokens
- configurable highlight styles
- better low-contrast terminal fallback

7. `[P2]` Add TUI-focused integration tests
- scripted interactive scenarios for dialog/textarea/list/table
- regression coverage for overlay clipping and cursor rendering

8. `[P2]` Documentation hardening
- add dedicated primitive cookbook examples
- add migration notes from FE/Web patterns to TUI patterns
