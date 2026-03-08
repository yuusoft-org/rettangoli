# Development Guide

Canonical engineering and product contract for `packages/rettangoli-sites`.

## Scope

`@rettangoli/sites` has two different surfaces that must stay aligned:

- runtime source in `src/`
- published built-in assets in `sites/`

The built-in assets are product surface, not examples.
A built-in template or partial is considered production-ready only when its formal interface, runtime dependencies, documentation, and visual coverage are all present.

## Source Of Truth Order

Do not author built-ins by intuition.
Use this order when changing templates, partials, themes, or site behavior:

1. `apps/rettangoli.dev/static/llms.txt`
2. this document
3. `packages/rettangoli-ui/DEVELOPMENT.md`
4. relevant UI docs under `apps/rettangoli.dev/pages/ui/docs/`
5. relevant Sites docs under `apps/rettangoli.dev/pages/sites/docs/`
6. relevant VT docs under `apps/rettangoli.dev/pages/vt/docs/`

If a built-in template needs behavior from `@rettangoli/ui`, the UI contract wins.
`@rettangoli/sites` may compose documented UI primitives/components, but it must not invent new UI behavior.

## Product Model

Treat each published asset as a versioned product unit.

Asset groups:
- templates under `sites/templates/`
- partials under `sites/partials/`
- runtime public assets under `sites/public/`
- theme bundles under `sites/themes/`
- data contract schemas under `sites/schemas/`

Every published asset must have a matching entry in:
- `sites/contracts/builtin-asset-registry.yaml`

That registry is the machine-readable source of truth for:
- public asset ids
- stability level
- file paths
- schema references
- dependency edges
- docs coverage
- example coverage
- VT coverage

## Ownership And Migration Policy

Reusable site templates belong in `packages/rettangoli-sites`.

App-local templates are allowed only when at least one of these is true:
- the template is product-specific and not intended for reuse
- the template depends on app-local data or runtime that is not part of the public package contract
- the template is an experiment and is not yet ready for built-in stability

When an app-local template proves reusable, migrate it here with this exact flow:

1. extract reusable shell/partials into `sites/`
2. remove app-local-only assumptions and hidden runtime dependencies
3. define or tighten the schema contract in `sites/schemas/data-contract.schema.yaml`
4. register the published assets in `sites/contracts/builtin-asset-registry.yaml`
5. add or update docs and example consumers
6. add VT coverage for desktop and mobile behavior
7. only then mark the asset `stable`

## Stable Interface Rules

A built-in template or partial must have all of the following before it is considered stable:

1. published file in `sites/`
2. registry entry in `sites/contracts/builtin-asset-registry.yaml`
3. formal data contract schema reference in `sites/schemas/data-contract.schema.yaml`
4. docs coverage in package docs and/or rettangoli.dev docs
5. at least one example consumer or preview page
6. VT coverage for the rendered behavior or an explicit composite coverage note
7. no hidden project-local runtime dependencies

"Hidden dependency" means the asset assumes files, theme classes, data keys, or JS helpers that are neither:
- encoded in the public contract
- published with the package
- documented as required consumer inputs

## Contract Design Rules

### Templates

Templates are layout shells.
They should contain:
- document root
- head assets
- stable page shell layout
- content slot insertion
- calls to reusable partials

Templates should not accumulate page-specific branching logic.
Move reusable branching to partials or to page data shape.

### Partials

Partials are reusable product blocks.
A partial should expose a narrow, documented input shape and avoid reading unrelated page state.

### Schemas

Schema refs are the formal interface.
If a built-in template or partial changes its required data contract, update:
- `sites/schemas/data-contract.schema.yaml`
- the registry entry
- docs
- VT coverage if rendering changes

### Runtime Assets

If a built-in asset needs JS/CSS/media at runtime, publish it under `sites/` and register it.
Do not rely on consumer-local `/public/*` files unless the dependency is explicitly part of the interface and documented.

## UI Drift Rules

`@rettangoli/sites` is allowed to compose Rettangoli UI primitives/components, but it must not invent a second UI system.

Mandatory rules:
- use documented `rtgl-*` tags only
- use documented responsive prefixes only
- keep shell/layout tokens consistent across built-ins
- prefer shared partials over one-off template markup forks
- keep theme usage explicit and registered

When a visual change is needed across multiple built-ins, change the shared partial or theme bundle instead of patching each template independently.

## Registry Rules

`sites/contracts/builtin-asset-registry.yaml` must stay complete.

If you add a new published asset, add a registry entry in the same PR.
If you remove or rename a published asset, update the registry in the same PR.

The registry should describe:
- public id
- stability (`stable`, `experimental`, `deprecated`)
- published path
- schema ref when data is required
- docs paths
- example paths
- VT spec paths
- dependency ids

## Required Test Pyramid

Stable built-ins need more than one test type.
Minimum test layers:

1. contract tests
   - registry integrity
   - published file existence
   - schema ref existence
   - dependency resolution
2. static guard tests
   - no hidden `/public/*` dependencies
   - no undocumented external runtime helpers
   - no accidental drift between published assets and registry
3. render and behavior tests
   - site build succeeds for representative example pages
   - page data validates against the referenced schema
4. VT coverage
   - desktop and mobile for each stable template
   - critical interactive states for nav, sidebars, and toggles
5. release checks
   - stable built-in changes must update registry/docs/VT in the same PR

If a template only passes unit-style checks but lacks VT coverage, it is not production-ready.

## Release Rules

Before shipping a new stable built-in asset or changing an existing stable asset:

1. validate the registry and file references
2. validate data contract schema refs
3. validate VT coverage exists
4. run package tests
5. review rendered output in theme lab / preview pages
6. document any breaking contract changes explicitly

## `rtgl sites check`

Current implemented scope:

- `rtgl sites check --builtins`
  - validates registry integrity
  - validates published file existence and identity
  - validates schema ref existence
  - validates required docs/example/vt coverage references
  - validates template and partial dependency resolution
  - validates hidden runtime dependency regressions already encoded in package tests
- `rtgl sites check --site`
  - validates consumer pages that use imported built-in templates
  - reconstructs page context using the same frontmatter/global-data/_bind rules as build
  - validates page data against the referenced built-in template schema
  - skips local/custom templates instead of guessing their contract

Future scopes should validate at least these additional layers:

1. local/custom template contracts once a formal app-level contract format exists
2. release diff checks for changed stable assets

The current package foundation should make that command straightforward to implement without guessing.
