# Diagnostics Reference

This document defines the Phase 12 diagnostics contract for `@rettangoli/check`.

## Namespace Contract

Diagnostic code namespace regex:

`^RTGL-(CHECK|CONTRACT|CLI|IR)-[A-Z0-9-]+-\d{3}$`

Codes outside this namespace are surfaced with `namespaceValid: false` for compatibility and migration visibility.

## Reporter Contracts

- Text reporter: stable human-readable output with location formatting, codeframes, trace lines, related locations, and fix hints.
- JSON reporter: versioned by `schemaVersion: 1`, `contractVersion: 1`, and `diagnosticCatalogVersion`.
- SARIF reporter: SARIF 2.1.0-compatible output with deterministic rule/result ordering and partial fingerprints.

## Family Mapping

Default family and severity are inferred from code prefixes:

- `RTGL-CHECK-YAHTML-*`: `template`, `error`
- `RTGL-CHECK-JEMPL-*`: `template`, `error`
- `RTGL-CHECK-BINDING-*`: `template`, `error`
- `RTGL-CHECK-EXPR-*`: `expression`, `error`
- `RTGL-CHECK-SCHEMA-*`: `schema`, `error`
- `RTGL-CHECK-SYMBOL-*`: `symbols`, `error`
- `RTGL-CHECK-LISTENER-*`: `listeners`, `error`
- `RTGL-CHECK-REF-*`: `refs`, `error`
- `RTGL-CHECK-HANDLER-*`: `handlers`, `error`
- `RTGL-CHECK-LIFECYCLE-*`: `lifecycle`, `error`
- `RTGL-CHECK-COMPAT-*`: `compatibility`, `error`
- `RTGL-CHECK-METHOD-*`: `methods`, `error`
- `RTGL-CHECK-CONTRACT-*`: `contracts`, `error`
- `RTGL-CONTRACT-*`: `contracts`, `error` (legacy compatibility namespace)
- `RTGL-CHECK-SEM-*`: `semantic`, `warn`
- `RTGL-CHECK-SEM-INV-*`: `semantic-invariants`, `error`
- `RTGL-CHECK-CONSTANTS-*`: `constants`, `error`
- `RTGL-CHECK-COMPONENT-*`: `component-identity`, `error`
- `RTGL-CHECK-READ-*`: `io`, `error`
- `RTGL-CHECK-PARSE-*`: `parse`, `error`
- `RTGL-CHECK-REGISTRY-*`: `registry`, `warn`
- `RTGL-CLI-*`: `cli`, `error`

## Template Binding Diagnostics

FE reads each template key's attribute part (after the first space) with `parseNodeBindings` when it renders the element, and throws on the inputs below. Check reports the first such problem of each key, on native and custom elements, also with `--no-yahtml`. Names and tokens that contain `${...}` or `#{...}` (for example a `${containerAttrString}` spread or `data-${key}=1`) are rendered at runtime and are not judged.

### RTGL-CHECK-BINDING-001

An invalid binding name or attribute token: an empty name (`=x`), an empty prop name (`:=x`), a plain or `?` name, or a bare token, that does not match `^[A-Za-z_][A-Za-z0-9_.:-]*$` (`1invalid`, `0=bad`; a `:` prop name only needs to be non-empty, so `:1x=${a}` is accepted), or an event binding (`@click=handleClick`, bare `@click`). Template keys cannot bind events; declare listeners under `refs.<id>.eventListeners` instead.

### RTGL-CHECK-BINDING-002

A boolean toggle for a value-carrying attribute: `?aria-*`, `?data-*` or `?role`. Bind the value instead, for example `aria-pressed=${pressed}`.

### RTGL-CHECK-BINDING-003

A duplicate prop after camelCasing, for example `placeholder=a :placeholder=${b}` on a custom element, `:foo-bar=${a} :fooBar=${b}` on any element, or `?hidden hidden` on a custom element. Use only one of `name=value` or `:name=${expr}`.

### RTGL-CHECK-COMPAT-002, RTGL-CHECK-COMPAT-005, RTGL-CHECK-COMPAT-006, RTGL-CHECK-HANDLER-003 (retired)

Formerly checked `@event=handler` attributes against the element's events and the component's handlers. FE does not support `@event` attributes, so such a template now gets `RTGL-CHECK-BINDING-001`, and these codes are no longer emitted.

## Listener Payload Diagnostics

### RTGL-CHECK-LISTENER-010

A ref listener `payload` must be a YAML mapping. FE passes the payload to the handler or action only when it is a mapping, so a string, number, `true` or list payload is silently ignored at runtime. A falsy payload (`null`, `false`, `0`, `""`) is treated as no payload and is not reported.

### RTGL-CHECK-CONTRACT-004 (retired)

Formerly compared the keys of a string payload such as `"{ id: x }"` with the handler or action parameters. FE never uses string payloads, so the rule checked a payload that does nothing. Such payloads now get `RTGL-CHECK-LISTENER-010`, and `RTGL-CHECK-CONTRACT-004` is no longer emitted.

## Schema Diagnostics

### RTGL-CHECK-SCHEMA-009

`ssr` in `.schema.yaml` must be a boolean (`ssr: true` or `ssr: false`). FE throws "ssr must be a boolean." when it registers a component whose `ssr` is anything else, such as `"no"`, `"false"`, `0` or an empty value.

## JavaScript Parse Diagnostics

### RTGL-CHECK-PARSE-002

A `.handlers.js`, `.store.js` or `.methods.js` file, or a module it re-exports from, does not parse as JavaScript (or TypeScript). The diagnostic points at the first syntax error. The exports of such a file, and of every file that re-exports from it, are unknown, so check does not report missing handler, action or method exports (`RTGL-CHECK-SYMBOL-001/002/003/007`, `RTGL-CHECK-SEM-004`) for them. A file shared by several components is reported once.

## UI Registry Diagnostics

### RTGL-CHECK-REGISTRY-001

A warning: a UI primitive defined by the resolved `@rettangoli/ui` (for example in `registerPrimitives.js`) could not be loaded, because its module failed to import, its default export is not a factory function, the factory threw, or its source file could not be read or scanned for attributes. The tag stays a known element with the attributes check could still find, so its usages are still checked, but attributes that only the loaded class declares (`observedAttributes`) are unknown. Check therefore does not report `RTGL-CHECK-YAHTML-003` (unsupported attr/prop) on that tag; other checks, such as `RTGL-CHECK-YAHTML-002`, still run. Each failing tag is reported once, at the primitive's module path. `--warn-as-error` makes it fail the run.

## Autofix-Capable Diagnostics

### RTGL-CONTRACT-003

Property binding syntax that FE rejects: any legacy `.prop=` binding, and `:prop=` bindings whose value is quoted or not exactly `${...}` (`:title=literal`, `:title="${x}"`). Use `:prop=${...}` in `.view.yaml`. A fix is attached only to an unquoted `.prop=${expr}` binding with a name matching `[A-Za-z_][\w-]*` (not `.1x` or `.a.b`); its safe conversion is `.prop=${expr}` -> `:prop=${expr}`; other values need a manual edit.

### RTGL-CHECK-YAHTML-002

Legacy YAHTML `.prop` bindings are unsupported. Convert `.prop=${expr}` to `:prop=${expr}` and wrap bare property values in `${...}` when needed. The fix is attached only to an unquoted `.prop=${expr}` binding.

## Docs Link Contract

`docsPath` is generated as:

`docs/diagnostics-reference.md#<code-lowercased-non-alnum-replaced-by-dash>`

Example:

- `RTGL-CHECK-YAHTML-002` -> `docs/diagnostics-reference.md#rtgl-check-yahtml-002`

## Validation

Contract tests:

- `test/scenarios/74-cli-sarif-success`
- `test/scenarios/123-cli-autofix-dry-run-json`
- `test/scenarios/124-cli-autofix-dry-run-patch-json`
- `test/scenarios/125-cli-autofix-apply-json-success`
- `test/scenarios/132-binding-event-attribute-rejected` .. `137-binding-parse-yaml-error-text-scan`
- `test/scenarios/138-schema-ssr-not-boolean` .. `141-jempl-control-paren-directive-rejected`
- `test/scenarios/142-compat-for-local-shadows-prop`, `143-compat-prop-mismatch-outside-for`
- `scripts/test-ui-registry-load-contract.js` (RTGL-CHECK-REGISTRY-001)
- `scripts/test-discovery-symlinks-contract.js` (component discovery through symlinks)
