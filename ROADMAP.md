# Rettangoli Roadmap: enforced by default

This roadmap covers one theme across the packages: Rettangoli checks its own rules, so applications do not have to. Package-level plans stay in [`packages/rettangoli-fe/docs/roadmap.md`](./packages/rettangoli-fe/docs/roadmap.md) and [`packages/rettangoli-check/ROADMAP.md`](./packages/rettangoli-check/ROADMAP.md).

## Principle

- **A rule about Rettangoli code is a check, not a sentence.** If a rule concerns views, schemas, stores, handlers, methods or component folders, `rtgl check` enforces it.
- **Checks are on by default and report errors.** There is no opt-in mode for a rule the framework states.
- **Each construct has one form.** A check never adds a second way to write something.
- **A diagnostic names the fix,** not only the problem.
- **Applications should need little of their own lint configuration** to keep Rettangoli code correct. What is left to an application is what the framework cannot know, such as its product areas.

The reason is practical. Code written by many contributors, including coding agents, copies the patterns it finds. A rule that exists only in documentation is followed until the first time it is not, and then the exception is copied.

## Now

| # | Item | Package | Outcome |
|---|---|---|---|
| 1 | Audit every MUST in the FE docs | fe, check | Each rule is enforced by the checker, rejected by the runtime or build, or reworded. The first pass is the [table below](#contract-enforcement-audit). |
| 2 | Remove the checker's retired parts | check | The semantic engine, the `--expr` checks, autofix and `RTGL-CHECK-COMPAT-004` are deleted. Their flags stay accepted and warn for one minor release. |
| 3 | No module-scope mutable state in component modules | check | New error `RTGL-CHECK-MODULE-001` for `.handlers.js`, `.store.js` and `.methods.js`. Module state is shared by every instance of a component. |
| 4 | Stores are pure | check | New error `RTGL-CHECK-STORE-001` for a store that reads an impure global such as `window`, `console`, `Date.now()` or `Math.random()`. |
| 5 | Diagnostics name the fix | check | The most common diagnostics (unsupported attribute, unknown element, unknown listener option) say what to change. |
| 6 | `rtgl fe build` and `rtgl fe watch` print check diagnostics | rtgl, check | A developer sees contract errors without running a second command. |
| 7 | Root `AGENTS.md` | repo | Repository-wide rules are written in one place. |

## Next

These move rules into the framework that applications enforce today with their own lint rules or with prose.

| Item | Package | Notes |
|---|---|---|
| Handlers reach the outside world only through `deps` | check | An error for a handler that uses a browser global directly (`window`, `document`, timers, `fetch`, storage). The design must first list what a handler may still construct itself, such as `CustomEvent` for `dispatchEvent`. This is a breaking check for existing applications, so it ships in a major release with a migration note. |
| A component folder does not import another component folder | check | Components compose through tags, props, events and slots. |
| Handlers read state through selectors | check | An error for `store.getState()` in a handler. |
| Close the gaps found by the audit | fe, check | See the rows marked "No" in the table below. |
| One checker | check, fe, rtgl | Port the i18n validators into `rtgl check` and retire `rtgl fe check` (decision D8 in the checker roadmap). |
| `rtgl fe build` fails on check errors | rtgl | Depends on exact source positions in the checker (see "Known limits" in the checker roadmap), so a build is never blocked by a misplaced diagnostic. |
| Mistakes the runtime only warns about become build errors | fe, check | For example a listener whose handler is not exported, and an invalid item in a view template. The runtime stays lenient so a shipped page does not break; the checker rejects the mistake before shipping. |

## Later

- **Declared layers.** Let a project declare its source folders and the allowed import directions in `rettangoli.config.yaml`, and have `rtgl check` enforce them along with "this folder uses no globals". The folder names stay the application's choice.
- **Nested component folders.** Confirm with a test that pages and components load and check correctly from nested folders such as `features/<area>/components/<name>/`.
- **Verification for agents.** A way to run one `rtgl vt` spec on demand and read back its screenshots, and a generated list of a project's pages and components with their visual test coverage.
- **A linter for this repository.** Add rules here when a mistake recurs, starting from the linter's default correctness rules.

## Contract enforcement audit

First pass, 2026-11-16. It lists each MUST in `packages/rettangoli-fe/docs/` that constrains application code. Statements that describe what the FE runtime or build itself must do are covered by FE's own tests and are left out.

| Rule | Source | `rtgl check` | Runtime or build | Gap |
|---|---|---|---|---|
| `elementName` is a valid, unique custom element name | `schema.md` | Yes (`SCHEMA-*`, `COMPONENT-003`) | Yes (`RTGL-CONTRACT-006`) | None |
| Each method in `methods.properties` is a named export of `.methods.js` | `schema.md`, `methods.md` | Yes (`METHOD-*`) | Yes | None |
| `.view.yaml` declares no API metadata keys | `view.md` | Yes | Yes | None |
| A component node does not set one prop in both attribute and property form | `overview.md` | Yes (`BINDING-003`) | Yes | None |
| Ids used by refs are camelCase | `view.md` | Yes (`REF-001`) | Yes | None |
| `handleBeforeMount` is synchronous and returns no Promise | `handlers.md` | Yes (`LIFECYCLE-001`) | Yes, throws | None |
| Action and method payloads are objects | `store.md`, `methods.md`, `overview.md` | No | Yes, throws | Acceptable: the value is only known at runtime |
| Constants are read-only | `constants.md` | No | Yes, deep-frozen | None |
| `.view.yaml` reads only `selectViewData` output | `store.md` | Not needed | Yes, by construction | None |
| Store exports keep the documented order | `store.md` | No | No | **No.** Enforce in the checker or reword to a recommendation |
| `selectViewData` has no side effects | `store.md` | Planned (item 4) | No | Closed by item 4 |
| Applications do not pass `i18n` or `locale` through setup | `i18n.md` | No | Not found | **No.** Reject in the build |
| Locale files: one file per locale, two key levels, string leaves, keys of the default locale present | `i18n.md` | No | Yes (`rtgl fe build`, `rtgl fe check`) | Moves to `rtgl check` with "One checker" |
| Views read `i18n` with exactly two levels and call no i18n functions | `i18n.md` | No | Yes (`rtgl fe check`) | Moves to `rtgl check` with "One checker" |
| Serialized props of a prerendered root are JSON data | `prerender.md` | No | Yes, throws | Acceptable: runtime value |
| The first client render of a prerendered component is a pure function of the build inputs | `prerender.md` | Partly, with items 3 and 4 | No | **Partly.** Cannot be fully checked statically |
| A prerendered page loads the bundle as a module script without `async` | `prerender.md` | No | No | **No.** The page is outside the checked sources |

The "Not found" entry means a search of the FE runtime for a rejection of that case found none; it still needs a test to confirm.
