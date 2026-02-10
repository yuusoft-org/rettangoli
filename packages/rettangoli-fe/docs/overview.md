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

## Cross-File Contracts

### Input Model (`props` only)

- Components expose a single input surface: `props`.
- Attribute-form (`name=value`) and property-form (`:name=value`) both target `props` for component nodes.
- Attribute-form kebab-case names are normalized to camelCase (`max-items` -> `maxItems`).
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
- `_action` is an internal dispatch field; app payloads SHOULD NOT rely on it.

### Refs Model

- `deps.refs` is a map of `refKeyOrId -> DOM element` (direct element, not wrapper object).
- Refs key grammar:
- unprefixed key (`submitButton`) => ID target (default)
- `#submitButton` => explicit ID target
- `.label` => class target
- ID refs matching requires camelCase element IDs.
- Kebab-case element IDs are invalid for ID refs matching.
- `refs.window` and `refs.document` are reserved global listener targets.

## Spec Index

- `view.md`: view language grammar, bindings, refs, events, precedence, validation
- `store.md`: store contracts and view access boundary
- `handlers.md`: lifecycle and handler contracts
- `schema.md`: component API metadata contract
- `methods.md`: optional public imperative method contract
- `constants.md`: optional constants contract

## Contract Check

Run `rtgl fe check` to enforce:
- required `.schema.yaml` per component
- forbidden API keys are not present in `.view.yaml` (`elementName`, `viewDataSchema`, `propsSchema`, `events`, `methods`, `attrsSchema`)

Output modes:
- `rtgl fe check` (default `text`): grouped summary by rule and component, plus detailed lines
- `rtgl fe check --format json`: machine-readable JSON report for CI tools

## Conflict Resolution

If two documents appear to conflict:
1. More specific contract wins (`view.md`, `store.md`, `handlers.md`, `schema.md`, `methods.md`, `constants.md`).
2. `overview.md` acts as index and cross-file baseline.
