# AGENTS Guide: `packages/rettangoli-ui`

This file is for coding agents working inside `packages/rettangoli-ui`.
Follow this first, then package docs.

## 1. Scope

`@rettangoli/ui` contains:
- primitives in `src/primitives/` (plain custom elements)
- FE-driven components in `src/components/` (built by `@rettangoli/fe`)
- VT specs in `vt/`

## 2. Source Of Truth

For FE component contracts, the canonical spec is:
- `packages/rettangoli-fe/docs/overview.md`
- `packages/rettangoli-fe/docs/view.md`
- `packages/rettangoli-fe/docs/store.md`
- `packages/rettangoli-fe/docs/handlers.md`
- `packages/rettangoli-fe/docs/schema.md`
- `packages/rettangoli-fe/docs/methods.md`
- `packages/rettangoli-fe/docs/constants.md`

If `packages/rettangoli-ui/DEVELOPMENT.md` conflicts with FE docs, FE docs win.

## 3. Required FE Component Contract

For every component under `src/components/<name>/`:
- required: `*.view.yaml`
- required: `*.schema.yaml`
- optional: `*.handlers.js`, `*.store.js`, `*.methods.js`, `*.constants.yaml`

`*.view.yaml` is view-only:
- allowed: `template`, `refs`, `styles`
- forbidden: `elementName`, `viewDataSchema`, `propsSchema`, `events`, `methods`, `attrsSchema`

`*.schema.yaml` is API metadata:
- `componentName` required
- `propsSchema` is runtime source of props contract
- `events` and `methods` documented here

## 4. Runtime Semantics To Preserve

- Components expose `props` only (no separate attrs API surface).
- Both `name=value` and `:name=value` feed `props` on component nodes.
- Attribute kebab-case is normalized to camelCase (`max-items` -> `maxItems`).
- `name=value` and `:name=value` for the same prop on one node is invalid.
- Runtime read precedence is direct property value first, then attribute fallback.

Refs:
- Unprefixed ref key means ID match (`submitButton`).
- `#id` explicit ID, `.class` class matching.
- ID refs require camelCase IDs for matching.
- reserved keys: `window`, `document`.
- `deps.refs[key]` returns the element directly (not wrapper object).

Events:
- listener must define exactly one of `handler` or `action`
- payload for actions should be object; missing payload defaults to `{}`
- supported modifiers include `preventDefault`, `stopPropagation`, `stopImmediatePropagation`, `targetOnly`, `once`, `debounce`, `throttle`

## 5. Commands You Should Run

From `packages/rettangoli-ui/`:

```bash
bun run check:contracts
bun run build:dev
```

When visual/UI behavior changes:

```bash
bun run vt:generate
bun run vt:report
```

## 6. Current Migration Reality

The repo is mid-migration to mandatory `.schema.yaml`.
Expect legacy component view files to still contain old API keys.
When touching a component, prefer migrating it fully to the new contract in the same change.

## 7. Editing Rules

- Do not hand-edit generated output in `.rettangoli/`, `.temp/`, or `dist/` unless explicitly requested.
- Keep changes scoped; avoid unrelated formatting churn.
- Preserve existing component public behavior unless task explicitly changes behavior.
- For new components, ensure `rettangoli.config.yaml` and `vt` specs are updated when needed.

## 8. Suggested Change Flow

1. Read component files (`view`, `store`, `handlers`, optional `methods/constants`).
2. Migrate/add `schema` first.
3. Clean `view` to view-only keys.
4. Run `bun run check:contracts`.
5. Run `bun run build:dev`.
6. If UI changed, run VT generation/report and update baselines only when intended.
