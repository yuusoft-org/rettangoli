# @rettangoli/check

Static contract checker for Rettangoli FE projects. It reads each component's files (`.view.yaml`,
`.schema.yaml`, `.handlers.js`, `.store.js`, `.methods.js`, `.constants.yaml`) and reports, before build or
runtime, the template and contract problems that `@rettangoli/fe` would otherwise hit while rendering or
registering the component.

The checker only reads files. It never executes application modules.

## Usage

`rtgl check` (from `@rettangoli/cli`):

```bash
# directories from rettangoli.config.yaml (fe.dirs), else ./src/components
rtgl check

# explicit directories (repeatable)
rtgl check --dir src/components --dir src/pages

# machine-readable output
rtgl check --dir src/components --format json
rtgl check --dir src/components --format sarif

# treat warnings as errors
rtgl check --warn-as-error

# skip the attribute checks against the UI registry (YAHTML-*)
rtgl check --no-yahtml

# opt into naming and signature conventions (also `check: { style: true }` in rettangoli.config.yaml)
rtgl check --style

# template expression scope/type checks
rtgl check --expr

# re-run on file changes (polling)
rtgl check --watch --watch-interval-ms 500
```

The package also ships the `rtgl-check` bin. It accepts the same options plus the autofix options, which
`rtgl check` does not expose:

```bash
# preview safe fixes (with patch text)
rtgl-check --dir src/components --format json --autofix-dry-run --autofix-patch

# apply safe fixes
rtgl-check --dir src/components --autofix --autofix-min-confidence 0.95
```

Exit code `1` means at least one error (or a warning with `--warn-as-error`). JSON and SARIF go to stdout. The
text report goes to stderr when the check fails and to stdout otherwise.

Programmatic use:

```js
import { analyzeProject } from "@rettangoli/check";
import { check } from "@rettangoli/check/cli";

const result = await analyzeProject({ cwd: process.cwd(), dirs: ["src/components"] });
// { ok, cwd, dirs, componentCount, diagnostics, summary, registryTagCount, ... }
```

## UI registry

Custom elements and their attributes are validated against the `@rettangoli/ui` that the checked project
installs. The UI source is resolved in this order: the workspace root itself, `packages/rettangoli-ui` in the
workspace, the project's installed `@rettangoli/ui`, the monorepo copy next to this package, and finally the
checker's own `@rettangoli/ui` dependency.

The registry holds the UI components' schema properties, the primitives' attributes, attributes used by
`:host([attr])` selectors in component styles and in the shared style modules a primitive imports, and the
custom elements an application defines with static `customElements.define` calls in `src`.

## What it checks

Each diagnostic has a stable code. `docs/diagnostics-reference.md` describes the codes added or changed by
recent fixes and the reporter contracts.

- Components: folder and file naming, and colliding component identities (`RTGL-CHECK-COMPONENT-*`).
- FE contract parity: missing `.schema.yaml`, forbidden keys in `.view.yaml`, and property bindings FE
  rejects, such as `.prop=` or `:prop=literal` (`RTGL-CONTRACT-001..003`).
- Schemas and constants (`RTGL-CHECK-SCHEMA-*`, `RTGL-CHECK-CONSTANTS-001`), including a duplicate
  `componentName` (`RTGL-CHECK-SCHEMA-008`) and a non-boolean `ssr` (`RTGL-CHECK-SCHEMA-009`).
- Template bindings FE throws on while rendering: invalid names or tokens and `@event` attributes
  (`RTGL-CHECK-BINDING-001`), `?aria-*` / `?data-*` / `?role` toggles (`RTGL-CHECK-BINDING-002`), and
  duplicate props (`RTGL-CHECK-BINDING-003`). These run on every element and also with `--no-yahtml`.
- Template attributes against the UI registry: unknown custom elements, legacy `.prop` bindings and
  unsupported attributes or props (`RTGL-CHECK-YAHTML-001..003`). Template keys are split and their binding
  names read the way FE reads them.
- Jempl control flow (`RTGL-CHECK-JEMPL-*`).
- Refs and listeners: ref keys, listener options, handler/action exclusivity, and payloads
  that must be mappings (`RTGL-CHECK-REF-*`, `RTGL-CHECK-LISTENER-001..010`).
- Cross-file symbols: listener handlers in `.handlers.js`, actions in `.store.js`, and `schema.methods` in
  `.methods.js`, including re-exports (`RTGL-CHECK-SYMBOL-*`), handler naming (`RTGL-CHECK-HANDLER-*`),
  lifecycle signatures (`RTGL-CHECK-LIFECYCLE-*`) and method payloads (`RTGL-CHECK-METHOD-*`).
- Component compatibility: missing required props and boolean or prop bindings of the wrong type
  (`RTGL-CHECK-COMPAT-001`, `003`, `004`).
- Input problems: unreadable files (`RTGL-CHECK-READ-001`), YAML that does not parse
  (`RTGL-CHECK-PARSE-001`), JavaScript that does not parse (`RTGL-CHECK-PARSE-002`; missing-export checks
  are then skipped for that file), and a UI primitive that fails to load (`RTGL-CHECK-REGISTRY-001`, a
  warning).
- With `--expr`: template expression roots, schema paths and boolean types (`RTGL-CHECK-EXPR-*`).

By default, runtime-supported camelCase component folders, helper exports, destructured or renamed lifecycle
arguments and unused payload arguments are accepted. `--style` reports them as convention violations.

## Docs

- `docs/diagnostics-reference.md`: diagnostic families, code details, reporter contracts.
- `docs/diagnostics-reporting-contract.md`, `docs/diagnostics-sarif-contract.md`,
  `docs/diagnostics-json-schema-v1.json`: report formats.
- `docs/cli-contract.md`: the `rtgl-check` command surface.
- `docs/template-analysis.md`: how template keys are collected and parsed.
- `docs/language-spec/`: rule specs referenced by the scenario tests.
- `docs/security-parser-attack-surface.md`: parser crash containment and fuzzing.
- `ROADMAP.md`: current state and pending decisions.

## Development

```bash
bun run test          # every contract test, scenario and fuzzer (same as `bun run ci`)
bun run test:package  # pack the package and smoke-test the tarball
```

`test/README.md` lists the scenario suite and the scripts.
