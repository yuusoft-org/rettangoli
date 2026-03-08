# Built-in Assets Contract

This document defines how `@rettangoli/sites` built-in templates, partials, runtime assets, and theme bundles are managed as production surface.

## Why This Exists

A published template is not just a YAML file.
A production-ready built-in template needs:

- a stable identifier
- a formal data contract
- explicit dependencies
- example coverage
- VT coverage
- release rules

Without that, template drift is inevitable.

## Canonical Files

Machine-readable source of truth:

- `sites/contracts/builtin-asset-registry.yaml`
- `sites/contracts/builtin-asset-registry.schema.yaml`
- `sites/schemas/data-contract.schema.yaml`

Authoring rules:

- `DEVELOPMENT.md`

## Asset Lifecycle

For each stable built-in asset, the same PR should update:

1. published asset file in `sites/`
2. registry entry
3. data contract schema ref if interface changed
4. docs
5. example consumer or preview file
6. VT coverage if rendered behavior changed

## What The Registry Covers

The built-in asset registry records:

- `templates`
- `partials`
- `runtimeAssets`
- `themeBundles`

Each entry describes:

- public `id`
- `stability`
- published file path
- schema ref when applicable
- docs paths
- example paths
- VT spec paths
- declared dependencies

## How `rtgl sites check --builtins` Uses It

`rtgl sites check --builtins` treats the registry as the formal package interface layer and validates:

1. all published built-ins are registered
2. all registry file references exist
3. all schema refs exist
4. all declared dependencies resolve
5. no hidden local-only runtime assets remain
6. stable assets have docs/examples/VT coverage

Current scope is package built-ins only.
Consumer-site page validation is now available through `rtgl sites check --site` for pages that import built-in templates.
Local/custom templates remain intentionally out of scope until they declare a formal app-level contract.

## No Hidden Dependencies

Built-in imported templates must not quietly depend on consumer-local files.
If a runtime helper is required, publish it under `sites/` and declare it in the registry.

That is why shared JS helpers now live under:

- `sites/public/mobile-nav.js`
- `sites/public/rtgl-icons.js`

Favicon usage is opt-in through data instead of hardcoded local files.

## Minimum Bar For New Stable Built-ins

Before marking a new asset as `stable`, require:

- narrow purpose
- schema-backed data contract
- example page
- VT coverage
- no hidden dependencies
- registry entry
- docs entry
