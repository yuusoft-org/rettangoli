---
template: vt-documentation
title: Step Actions
tags: documentation
sidebarId: vt-step-actions
---

`steps` lets you script interactions between screenshots.

## Step forms

String step:

```yaml
steps:
  - wait 200
  - screenshot
```

Block step (target by test ID):

```yaml
steps:
  - select login-email:
      - write user@example.com
      - keypress Enter
```

## Targeting with `select`

`select <testId>` is used as a block key and resolves `data-testid="<testId>"`.

Inside a `select` block, VT will target:

- first interactive child (`input`, `textarea`, `button`, `select`, `a`) if one exists
- otherwise the host element

## Action reference

| Action | Syntax | Notes |
| --- | --- | --- |
| `assert` | `assert url <substring>` | URL contains check |
| `assert` | `assert urlExact <url>` | Exact URL check |
| `assert` | `assert exists <selector>` | Selector exists |
| `assert` | `assert visible <selector>` | Selector becomes visible |
| `assert` | `assert hidden <selector>` | Selector becomes hidden |
| `assert` | `assert text <selector> <expected...>` | Selector text includes expected |
| `blur` | `blur` | `select` block only |
| `check` | `check` | `select` block only |
| `clear` | `clear` | `select` block only |
| `click` | `click <x> <y>` or `click` | Coordinate click or `select` target click |
| `customEvent` | `customEvent <eventName> [key=value ...]` | Dispatches `window` custom event |
| `dblclick` | `dblclick <x> <y>` or `dblclick` | Coordinate or `select` target |
| `focus` | `focus` | `select` block only |
| `goto` | `goto <url>` | Navigate URL and wait for network idle |
| `hover` | `hover <x> <y>` or `hover` | Coordinate or `select` target |
| `keypress` | `keypress <key>` | Keyboard press |
| `mouseDown` | `mouseDown` | Left mouse down |
| `mouseUp` | `mouseUp` | Left mouse up |
| `move` | `move <x> <y>` | Mouse move |
| `rclick` | `rclick <x> <y>` or `rclick` | Right click by coordinate or `select` target |
| `rightMouseDown` | `rightMouseDown` | Right mouse down |
| `rightMouseUp` | `rightMouseUp` | Right mouse up |
| `scroll` | `scroll <deltaX> <deltaY>` | Mouse wheel scroll |
| `select` | `select <testId>` | Block command |
| `selectOption` | `selectOption <value>` | `select` block only |
| `selectOption` | `selectOption value=<value>` | `select` block only |
| `selectOption` | `selectOption label=<label>` | `select` block only |
| `selectOption` | `selectOption index=<n>` | `select` block only |
| `setViewport` | `setViewport <width> <height>` | Current spec session only |
| `screenshot` | `screenshot` | Capture additional screenshot |
| `uncheck` | `uncheck` | `select` block only |
| `upload` | `upload <filePath...>` | `select` block only |
| `wait` | `wait <ms>` | Sleep |
| `waitFor` | `waitFor <selector> [state] [timeout]` | State: `attached`, `detached`, `visible`, `hidden` |
| `waitFor` | `waitFor selector=<selector> [state=<state>] [timeoutMs=<ms>]` | Named form |
| `write` | `write <text...>` | `select` block only |

## Assertions inside `select` block

Inside `select ...`, you can use:

- `assert exists`
- `assert visible`
- `assert hidden`
- `assert text <expected...>`

## Example flow

```yaml
steps:
  - waitFor [data-testid='login-page'] visible 5000
  - select login-email:
      - write user@example.com
  - select login-submit:
      - click
  - waitFor [data-testid='dashboard'] visible 5000
  - screenshot
```
