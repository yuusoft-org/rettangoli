# Rettangoli FE Interface Spec Overview

This `docs/` folder is the normative interface spec for `rettangoli-fe`.
All rules here are contractual unless explicitly marked as non-normative.

Normative keywords follow RFC 2119 intent:
- `MUST` / `MUST NOT`
- `SHOULD` / `SHOULD NOT`
- `MAY`

## Component File Set

| File | Responsibility |
| --- | --- |
| `.view.yaml` | UI tree (`template`), `refs`, `styles` |
| `.schema.yaml` (required) | Public component API and docs metadata (`componentName`, `description`, `examples`, `propsSchema`, `events`, `methods`) |
| `.store.js` | `createInitialState`, selectors, `selectViewData`, actions |
| `.handlers.js` | Lifecycle hooks, side effects, imperative event handling |
| `.methods.js` (optional) | Public element methods (named exports only) |
| `.constants.yaml` (optional) | Static constants injected into runtime context |

i18n locale files are project-level files, not component files. See
`i18n.md` for the `src/i18n/<locale>.yaml` contract.

### Component Identity

A component is the set of files that share a base name inside one folder, such
as `src/components/loginForm/loginForm.*`. Its id is `<category>/<name>`: the
name of the folder that holds the component's folder (`components`) and the
base name (`loginForm`).

- Two folders that give the same id are merged into one component, and the
  later file of each type wins. `rtgl fe build`, `rtgl fe watch` and
  `loadComponents` print one warning per such id. Rename one of them.
- File discovery follows symlinks, except dangling ones and links back to a
  directory it is already inside; those are skipped.
- A YAML syntax error in `rtgl fe build` or `rtgl fe watch` names the file.

## Cross-File Contracts

### Input Model (`props` only)

- Components expose a single input surface: `props`.
- Attribute-form (`name=value`) and property-form (`:name=${expr}`) both target `props` for component nodes.
- Attribute-form kebab-case names are normalized to camelCase (`max-items` -> `maxItems`).
- HTML lowercases attribute names, so the lowercased spelling (`maxitems`) is
  read and observed too, next to the kebab-case one (`max-items`).
- Attribute values are strings. An attribute with no value (`selected`) reads as `true`.
- A component node `MUST NOT` define both forms for the same normalized prop key.
- Runtime read precedence is property value first, then attribute fallback.
- `propsSchema` source of truth is `.schema.yaml`.
- `propsSchema` declared in `.view.yaml` is ignored.

### Payload Model

- Handler signature is `(deps, payload = {})`.
- Store action signature is `(ctx, payload = {})`.
- Action payload `MUST` be an object when provided; calling with no payload is valid.
- Event-driven handler dispatch injects `_event` into payload.
- Event-driven action dispatch injects `_event` and `_action` into payload.
- `_event` is the original DOM event, the same object for handlers and actions.
- Payload expressions in `.view.yaml` are evaluated once. Text in a value that
  looks like a template (`${...}`) stays literal.
- An action receives copies of plain objects and arrays from its payload; the
  event, `Date`, `File` and class-instance values are the same instances.
- `_action` is an internal dispatch field; app payloads SHOULD NOT rely on it.

### Refs Model

- `deps.refs` is a map of `refKeyOrId -> DOM element` (direct element, not wrapper object).
- Refs key grammar:
- unprefixed key (`submitButton`) => ID target (default)
- `#submitButton` => explicit ID target
- `.label` => class target
- ID refs matching requires camelCase element IDs.
- An element ID that a ref key cannot name (kebab-case such as `main-content`)
  takes part in no ID-ref match. The element still renders with that ID, and
  class refs still match it.
- `refs.window` and `refs.document` are reserved global listener targets.

### Element Surface

Other components and application code reach a component through:
- its props (`element.maxItems = 5`, or attributes)
- the methods in `.methods.js` (`element.focusInput()`)
- `element.transformedHandlers.<handlerName>(payload)`, which calls a handler
  export with the component's `deps` already bound (`handlers.md`)

## Spec Index

- `view.md`: view language grammar, bindings, refs, events, precedence, validation
- `store.md`: store contracts and view access boundary
- `handlers.md`: lifecycle and handler contracts
- `schema.md`: component API metadata contract
- `methods.md`: optional public imperative method contract
- `constants.md`: optional constants contract
- `i18n.md`: internationalization config, locale files, view usage, and locale switching
- `prerender.md`: prerendering at build time, the first-render contract, hydration and registration order

## Contract Check

Run `rtgl fe check` to enforce:
- required `.schema.yaml` per component (`RTGL-CONTRACT-001`)
- forbidden API keys are not present in `.view.yaml` (`elementName`, `viewDataSchema`, `propsSchema`, `events`, `methods`, `attrsSchema`) (`RTGL-CONTRACT-002`)
- no legacy property binding syntax in `.view.yaml` (`RTGL-CONTRACT-003`)
- a `.schema.yaml` that the browser accepts when it registers the component:
  `componentName` is set, `attrsSchema` is absent, `ssr` is a boolean, and the
  schema does not declare methods for a component that has no `.methods.js`
  (`RTGL-CONTRACT-004`). The check does not read the exports of `.methods.js`,
  so a declared method with no export is found only in the browser, where it
  fails registration.
- `componentName` is a valid custom element name (`RTGL-CONTRACT-005`): lowercase,
  starts with a letter, contains a `-`, uses no spaces or symbols other than
  `-`, `.` and `_`, and is not a reserved name such as `font-face`
- `componentName` is not used by another component (`RTGL-CONTRACT-006`)

The browser stops registering components at the first schema error, so one bad
schema can blank every component that registers after it. `rtgl fe check` fails
on `RTGL-CONTRACT-004` to `-006`. `rtgl fe build`, `rtgl fe watch` and
`rtgl fe scaffold` print one warning that lists them and still build.

Output modes:
- `rtgl fe check` (default `text`): grouped summary by rule and component, plus detailed lines
- `rtgl fe check --format json`: machine-readable JSON report for CI tools

## Conflict Resolution

If two documents appear to conflict:
1. More specific contract wins (`view.md`, `store.md`, `handlers.md`, `schema.md`, `methods.md`, `constants.md`).
2. `overview.md` acts as index and cross-file baseline.
