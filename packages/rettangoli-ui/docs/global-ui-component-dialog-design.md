# Global UI Component Dialog Design

## Purpose

`showComponentDialog(...)` is the global dialog API for custom stateful dialog
bodies that are too complex for `showFormDialog(...)`. It is implemented in
`rtgl-global-ui` and exposed by `createGlobalUI(...)`.

The motivating case is the layout editor slider creator dialog:

- custom image-picking UI
- multiple image preview slots
- validation that is not just plain schema fields
- dialog body state that belongs to a dedicated component

`showFormDialog(...)` is still the right API for schema-first forms such as the
fragment picker. This document covers the second API, for custom dialog
components.

## Problem

Besides `showComponentDialog(...)`, the global UI has `showAlert(...)`,
`showConfirm(...)`, `showFormDialog(...)`, `showDropdownMenu(...)` and
`showToast(...)`.

`showFormDialog(...)` exposes `mount(formEl)`, but that is an
imperative escape hatch. It is acceptable for small slot customization. It is
not the right long-term foundation for a dialog whose main content is a custom
interactive workflow.

Using `mount(formEl)` for slider creation would be too fragile because it would
force us to:

- imperatively inject custom UI into the form
- bridge multiple custom image controls through form methods
- keep custom UI state synchronized with form state manually
- treat a custom workflow as if it were only a decorated schema form

That is the wrong abstraction.

## Goals

- Keep the global dialog shell as the owner of dialog chrome and footer actions.
- Let the dialog body be a real component with its own state and logic.
- Let the dialog shell read values and trigger validation through a small public
  component-method contract.
- Keep the API consistent with existing Rettangoli public method patterns.
- Avoid `mount(...)`-style imperative DOM injection for complex workflows.

## Non-Goals

- Replace `showFormDialog(...)`
- Support arbitrary nested dialog stacks
- Introduce a generic plugin/registry framework in v1
- Move dialog action buttons into app-specific dialog body components

## Public API

### Global UI

The manager returned by `createGlobalUI(...)` has:

```js
globalUI.showComponentDialog(options);
```

## `showComponentDialog(options)`

### Options Shape

```js
{
  component: "rvn-layout-editor-slider-create-dialog",
  props: {
    direction: "horizontal",
    defaultValues: {
      name: "Slider",
    },
  },
  title: "Create Slider",
  description: "Choose images and configure the slider.",
  size: "md",
  actions: {
    buttons: [
      {
        id: "cancel",
        label: "Cancel",
        variant: "se",
        align: "left",
        role: "cancel",
      },
      {
        id: "create",
        label: "Create",
        variant: "pr",
        role: "confirm",
        validate: true,
      },
    ],
  },
}
```

### Field Meanings

- `component`
  - required custom element tag name to render inside the dialog body
  - it must contain a hyphen; otherwise the promise rejects with
    `component tag name is required for showComponentDialog`
- `props`
  - optional initial props passed to the body component
  - a value that is not an object, or is an array, is ignored
- `title`
  - optional dialog shell title, a plain string
- `description`
  - optional dialog shell description; a string, or an array of link text segments (`{ text, href?, newTab?, rel? }`, see the `rtgl-global-ui` docs)
- `size`
  - optional dialog size token: `sm | md | lg | f`; the default, and the
    fallback for any other value, is `md`
- `actions`
  - optional footer action config
  - shape matches the existing form-dialog `actions.buttons` mental model
  - without buttons, the default is the pair below; the labels come from the
    dialog `Cancel` and `OK` UI messages (see `setUiMessages`)
  - default:
    ```js
    {
      buttons: [
        {
          id: "cancel",
          label: "Cancel",
          variant: "se",
          align: "left",
          role: "cancel",
        },
        {
          id: "confirm",
          label: "OK",
          variant: "pr",
          role: "confirm",
          validate: true,
        },
      ],
    }
    ```

### Button Semantics

Each button may define:

- `id`
  - required non-empty string, the app-owned result id returned to the caller
- `label`
  - required non-empty string, the button text
- `variant`
  - shell button variant; the default is `pr` for `confirm` and `se` for
    `cancel`
- `align`
  - shell alignment: `left` or `right`; the default is `left` for `cancel` and
    `right` otherwise
- `disabled`, `pre`, `suf`
  - as for form action buttons
- `role`
  - required semantic role; any other value rejects the promise:
    - `"confirm"`
    - `"cancel"`
- `validate`
  - optional boolean
  - only meaningful for `role: "confirm"`
  - when `true`, the shell calls the body component `validate()` before
    `getValues()`

V1 supports `actions.buttons` as an array.

- more than one footer button is allowed
- every button must declare `role`
- multiple buttons may share the same `role`
- the caller distinguishes which one was used through `actionId`

The shell must not infer behavior from `id`, `variant`, or button order.
Behavior is driven by `role`.

## Props Contract

The shell passes the props through.

The contract is:

- `options.props` is a plain object
- each entry is assigned onto the body component element as a same-named
  component prop
- this maps to the normal Rettangoli FE component `props` surface
- the body component should declare those public props in `.schema.yaml`
  `propsSchema`
- props are delivered once, when the dialog opens
- props are not patched after open

The body element is created on the next timer tick after the dialog renders.
The shell implements this as:

```js
const bodyEl = document.createElement(options.component);

for (const [key, value] of Object.entries(options.props ?? {})) {
  bodyEl[key] = value;
}
```

## Result Contract

The dialog resolves:

```js
{
  actionId,
  values,
}
```

or:

```js
null;
```

### Rules

- confirm button:
  - validates the body component
  - if valid, resolves `{ actionId: button.id, values }`
- cancel button:
  - closes and resolves `{ actionId: button.id }`
- backdrop dismiss / escape:
  - closes and resolves `null`
- if validation fails:
  - dialog stays open
  - promise does not resolve
- if `validate()` or `getValues()` throws or rejects:
  - it is an implementation error and is not swallowed
  - the dialog closes and the dialog promise rejects with that error
- if the body lacks `validate()` or `getValues()`, or `validate()` does not
  return an object with a boolean `valid`:
  - the dialog closes and the promise rejects with an error
- `closeAll()`, and opening another global UI surface, close the dialog and
  resolve with `null`
- a result that arrives after the dialog was closed or replaced is dropped

This matches the current `showFormDialog(...)` behavior more closely than
returning `false` like `showConfirm(...)`, while still letting component-dialog
buttons be customized.

## Body Component Contract

The dialog shell owns the footer buttons. The body component owns the custom
workflow and exposes a small public imperative interface through `.methods.js`.

### Required Methods

```js
validate(): { valid: boolean, errors?: object } | Promise<{ valid: boolean, errors?: object }>
getValues(): object | Promise<object>
```

These are required for every component-dialog body component.

- the shell may assume both methods exist; it checks for them on every confirm
  click, also for buttons without `validate: true`
- missing methods are an implementation error, not a runtime fallback case
- `validate()` must return `{ valid, errors? }` with a boolean `valid`
- `getValues()` must return the payload resolved back to the caller
- a thrown or rejected method call is an implementation error and should reject
  the dialog promise

### Schema Contract

The body component should declare its public API explicitly:

- public props in `.schema.yaml > propsSchema`
- public methods in `.schema.yaml > methods.properties`
- method implementations in `.methods.js`

### Other Methods

The shell calls no other method. A body may expose more, such as
`setValues(values): void`, for its own callers.

### Why Methods

This matches existing Rettangoli patterns:

- public component methods already exist through `.methods.js`
- public methods are documented in component schema
- `rtgl-form` already exposes `validate()` and `getValues()`

The shell should not pull raw internal store state from the component. Public
methods make the contract explicit and stable.

## Confirm Flow

On confirm:

1. read the component ref
2. call `validate()` if the button has `validate: true`
3. if validation returns `{ valid: false }`, stop
4. call `getValues()`
5. close dialog
6. resolve:

```js
{
  actionId: button.id,
  values,
}
```

Pseudo-code:

```js
const body = refs.componentDialogBody;

if (button.role === "cancel") {
  closeCurrentUi({
    store,
    render,
    globalUI,
    emitResult: true,
    result: {
      actionId: button.id,
    },
  });
  return;
}

if (button.role === "confirm" && button.validate) {
  const validation = await body.validate();
  if (validation.valid === false) {
    return;
  }
}

const values =
  button.role === "confirm"
    ? await body.getValues()
    : undefined;

closeCurrentUi({
  store,
  render,
  globalUI,
  emitResult: true,
  result: {
    actionId: button.id,
    values,
  },
});
```

## Cancel Flow

On cancel-button click:

```js
closeCurrentUi({
  store,
  render,
  globalUI,
  emitResult: true,
  result: {
    actionId: button.id,
  },
});
```

No component method call is needed.

## Why The Buttons Stay In The Shell

Buttons should stay in the global dialog shell, not in the custom body
component.

Reasons:

- consistent dialog chrome across the product
- consistent keyboard and close behavior
- a single place for confirm/cancel semantics
- body components can focus on workflow logic only
- body components do not need to duplicate modal footer markup

The body component should render only dialog content.

## Example: Slider Create

Caller:

```js
const result = await globalUI.showComponentDialog({
  component: "rvn-layout-editor-slider-create-dialog",
  title: "Create Slider",
  description: "Choose images and configure the slider.",
  size: "md",
  props: {
    direction: "horizontal",
    defaultValues: {
      name: "Slider",
    },
  },
  actions: {
    buttons: [
      {
        id: "cancel",
        label: "Cancel",
        variant: "se",
        align: "left",
        role: "cancel",
      },
      {
        id: "create",
        label: "Create",
        variant: "pr",
        role: "confirm",
        validate: true,
      },
    ],
  },
});

if (!result || result.actionId !== "create") {
  return;
}

const { values } = result;
```

Body component methods:

```js
export function validate() {
  return this.transformedHandlers.handleValidate({});
}

export function getValues() {
  return this.transformedHandlers.handleGetValues({});
}
```

## Global UI Internal Model

The global UI store has the UI type `"componentDialog"` and a
`componentDialogConfig`:

```js
{
  key,
  title,
  description,
  size,
  component,
  props,
  actions,
}
```

`key` goes up by one on every call. The config is separate from
`formDialogConfig`; component-dialog fields are not mixed into the form dialog
config.

## Global UI View

The global UI view has a branch for component dialogs:

- it renders the dialog shell
- it renders the configured body component inside `slot=content`
- it keeps footer buttons in the shell
- it attaches a ref to the body component so handlers can call public methods

The exact low-level render mechanism is implementation detail. The important
contract is:

- the shell can render a custom component by tag name
- the shell can assign `options.props` onto the component as normal component
  props
- the shell can access it by ref

## Component Dialog Body Rules

The custom body component should follow these rules:

- no dialog chrome
- no duplicate Cancel / OK buttons
- own only workflow-specific UI and state
- surface values only through public methods
- surface validation through public methods
- declare public props in `propsSchema`
- declare public methods in `methods.properties`

While a component dialog is open, its body component must not open another
global UI surface through:

- `globalUI.showAlert(...)`
- `globalUI.showConfirm(...)`
- `globalUI.showFormDialog(...)`
- `globalUI.showDropdownMenu(...)`

Opening one closes the component dialog and resolves its promise with `null`.

If the component needs local nested dialogs or pickers, those remain an
internal detail of the body component. In V1 those are local component-owned
overlays, not additional global UI surfaces.

## Why Not Use `showFormDialog(...)`

`showFormDialog(...)` remains correct when:

- the source of truth is an `rtgl-form` schema
- custom behavior is limited to a few field events
- slot content is minor enhancement, not the main workflow

It is not the right fit when:

- the main body is a custom component
- the workflow has rich local state
- the UI is image-driven or highly interactive
- the body already has a natural component boundary

Slider create falls into the second category.

## V1 Scope

V1 supports:

- one custom body component
- footer actions through `actions.buttons`
- array-based footer actions
- explicit semantic roles on buttons
- validation on confirm
- value retrieval on confirm
- promise resolution with `{ actionId, values? }` or `null`

V1 does not support:

- arbitrary button semantics beyond `confirm` and `cancel`
- enabling or disabling buttons while the dialog is open
- stacked component dialogs
- cross-dialog shared body state

Those can be added later if a real product need appears.

## Decision Summary

- `fragmentCreate` should use `showFormDialog(...)`
- `sliderCreate` should use a new `showComponentDialog(...)`
- dialog footer buttons stay in the global dialog shell
- dialog behavior is driven by button `role`, not button `id`
- body values are retrieved through public component methods
- `mount(formEl)` is not the long-term solution for slider create
