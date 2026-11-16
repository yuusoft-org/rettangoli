# Diagnostics Reference

This document defines the Phase 12 diagnostics contract for `@rettangoli/check`.

## Namespace Contract

Diagnostic code namespace regex:

`^RTGL-(CHECK|CONTRACT|CLI|IR)-[A-Z0-9-]+-\d{3}$`

Codes outside this namespace are surfaced with `namespaceValid: false` for compatibility and migration visibility.

## Reporter Contracts

- Text reporter: stable human-readable output with location formatting, codeframes, trace lines, and related locations.
- JSON reporter: versioned by `schemaVersion: 1`, `contractVersion: 1`, and `diagnosticCatalogVersion`.
- SARIF reporter: SARIF 2.1.0-compatible output with deterministic rule/result ordering and partial fingerprints.

## Family Mapping

Default family and severity are inferred from code prefixes:

- `RTGL-CHECK-YAHTML-*`: `template`, `error`
- `RTGL-CHECK-JEMPL-*`: `template`, `error`
- `RTGL-CHECK-BINDING-*`: `template`, `error`
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

## Compatibility Diagnostics

### RTGL-CHECK-COMPAT-004 (retired)

Formerly compared the schema type of a `:prop=${...}` binding's expression with the target element's prop type. FE does not type-check props, and the inferred type ignored `selectViewData`, so the rule reported bindings that work at runtime. `RTGL-CHECK-COMPAT-004` is no longer emitted. Required props (`RTGL-CHECK-COMPAT-001`) and boolean bindings (`RTGL-CHECK-COMPAT-003`) are still checked.

## Expression And Semantic Diagnostics

### RTGL-CHECK-EXPR-001 .. RTGL-CHECK-EXPR-005 (retired)

Formerly reported, with `--expr` or `includeExpression`, template expression roots that did not resolve, schema paths that did not exist and operand or boolean type mismatches. The expression checks were removed; `--expr` and `includeExpression` are accepted and ignored, and these codes are no longer emitted.

### RTGL-CHECK-SEM-001, RTGL-CHECK-SEM-002, RTGL-CHECK-SEM-004, RTGL-CHECK-SEM-005, RTGL-CHECK-SEM-INV-* (retired)

Formerly emitted by the semantic engine (`runSemanticEngine`, `includeSemantic`) for unresolved or ambiguous symbols, unresolved cross-component tags and symbol-graph invariant failures. The engine was removed, `includeSemantic` is ignored, and these codes are no longer emitted.

## Ref Diagnostics

### RTGL-CHECK-REF-002 (retired)

Formerly reported a selector `#id` that id refs cannot name, such as `rtgl-button#submit-button`, in a view with id refs. FE renders such an element and just does not match it by id refs. An `id=` attribute also wins over `#id`. `RTGL-CHECK-REF-002` is no longer emitted.

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

A `.handlers.js`, `.store.js` or `.methods.js` file, or a module it re-exports from, does not parse as JavaScript (or TypeScript). The diagnostic points at the first syntax error. The exports of such a file, and of every file that re-exports from it, are unknown, so check does not report missing handler, action or method exports (`RTGL-CHECK-SYMBOL-001/002/003/007`) for them. A file shared by several components is reported once.

## UI Registry Diagnostics

### RTGL-CHECK-REGISTRY-001

A warning: a UI primitive defined by the resolved `@rettangoli/ui` (for example in `registerPrimitives.js`) could not be loaded, because its module failed to import, its default export is not a factory function, the factory threw, or its source file could not be read or scanned for attributes. The tag stays a known element with the attributes check could still find, so its usages are still checked, but attributes that only the loaded class declares (`observedAttributes`) are unknown. Check therefore does not report `RTGL-CHECK-YAHTML-003` (unsupported attr/prop) on that tag; other checks, such as `RTGL-CHECK-YAHTML-002`, still run. Each failing tag is reported once, at the primitive's module path. `--warn-as-error` makes it fail the run.

## Template Attribute Diagnostics

### RTGL-CHECK-YAHTML-003

An attribute or prop the custom element does not declare. Each key's tag and binding names are read from the key itself, the way FE reads them (`parseSelectorKey`), so flow mappings (`- {rtgl-text bogus=1: hi}`), escaped and multi-line keys are checked against their own tag. Names are reported in source order.

## Legacy Property Binding Diagnostics

### RTGL-CONTRACT-003

Property binding syntax that FE rejects: any legacy `.prop=` binding, and `:prop=` bindings whose value is quoted or not exactly `${...}` (`:title=literal`, `:title="${x}"`). Use `:prop=${...}` in `.view.yaml`.

### RTGL-CHECK-YAHTML-002

Legacy YAHTML `.prop` bindings are unsupported. Convert `.prop=${expr}` to `:prop=${expr}` and wrap bare property values in `${...}` when needed.

Autofix for these two codes was removed: diagnostics no longer carry a `fix` object, the catalog tag `autofix-safe` is gone, and the `rtgl-check --autofix*` flags are accepted as no-ops with a deprecation warning.

## Docs Link Contract

`docsPath` is generated as:

`docs/diagnostics-reference.md#<code-lowercased-non-alnum-replaced-by-dash>`

Example:

- `RTGL-CHECK-YAHTML-002` -> `docs/diagnostics-reference.md#rtgl-check-yahtml-002`

## Validation

Contract tests:

- `test/scenarios/74-cli-sarif-success`
- `test/scenarios/71-expression-option-ignored`, `101-compat-prop-binding-type-not-checked` (retired checks stay silent)
- `test/scenarios/123-cli-autofix-flags-noop-json`, `124-cli-autofix-flag-noop-sarif`, `125-cli-expr-flag-noop` (deprecated flags)
- `test/scenarios/132-binding-event-attribute-rejected` .. `137-binding-parse-yaml-error-text-scan`
- `test/scenarios/138-schema-ssr-not-boolean` .. `141-jempl-control-paren-directive-rejected`
- `test/scenarios/144-yahtml-key-parsed-from-own-key` (tag and names read from each key, not from a neighbouring line)
- `test/scenarios/145-cli-yahtml-attr-source-order` (YAHTML-003 of one key in source order)
- `scripts/test-ui-registry-load-contract.js` (RTGL-CHECK-REGISTRY-001)
- `scripts/test-discovery-symlinks-contract.js` (component discovery through symlinks)
