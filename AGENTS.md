# AGENTS.md

Guidance for coding agents and contributors working anywhere in this repository. A package's own `AGENTS.md` adds to this file and wins where the two differ.

## Repository

Rettangoli is a Bun workspace (`bun@1.3.5`). Run `bun install` once at the root.

| Path | Package | What it is |
|---|---|---|
| `packages/rettangoli-fe` | `@rettangoli/fe` | Frontend framework: YAML views, stores, handlers |
| `packages/rettangoli-ui` | `@rettangoli/ui` | Web component library |
| `packages/rettangoli-check` | `@rettangoli/check` | Static checker behind `rtgl check` |
| `packages/rettangoli-vt` | `@rettangoli/vt` | Visual testing |
| `packages/rettangoli-sites` | `@rettangoli/sites` | Static site generator |
| `packages/rettangoli-sitekit` | `@rettangoli/sitekit` | Site themes and templates |
| `packages/rettangoli-cli` | `rtgl` | The command-line interface over the packages above |
| `apps/rettangoli.dev` | | Documentation site |
| `examples/example1` | | Example application that CI builds and checks |

Package guides: [`fe`](./packages/rettangoli-fe/AGENTS.md), [`ui`](./packages/rettangoli-ui/AGENTS.md), [`vt`](./packages/rettangoli-vt/AGENTS.md), [`sitekit`](./packages/rettangoli-sitekit/AGENTS.md). Direction: [`ROADMAP.md`](./ROADMAP.md).

## This repository is public

Commits, branch names, pull request text, comments, docs, code comments and test fixtures are visible to anyone.

- Describe only the change in this repository: what it does, why, and how it was tested.
- Do not name private repositories or applications that use Rettangoli, and do not include local filesystem paths. Say "a consumer application" when a change comes from one.
- Do not mention which tool, agent or reviewer worked on a change, and do not add attribution trailers to commits or pull requests.
- Use neutral names in fixtures and examples.

## Rules become checks

When you correct a mistake in Rettangoli code or in how Rettangoli is used, prefer a fix that makes the mistake impossible or caught:

1. Change the API or the structure so the mistake cannot be written.
2. Otherwise add a check: a rule in `@rettangoli/check`, a runtime or build rejection, or a test.
3. Add prose (docs, this file) only for what needs judgment.

A rule about views, schemas, stores, handlers, methods or component folders belongs in `rtgl check`, on by default, with a message that names the fix. See [`ROADMAP.md`](./ROADMAP.md).

## One form per construct

Do not add a shorthand, an alias or a second way to express something that Rettangoli already expresses. Compose with components, props, events and slots.

## Docs are the contract

`packages/rettangoli-fe/docs/` is the interface specification for FE. Change the docs, the implementation, the checker (`packages/rettangoli-check/src/core/fe-contracts.js` mirrors FE's contracts and is parity-tested) and the tests together. The pages under `apps/rettangoli.dev/pages` repeat parts of these docs for users; update them in the same change.

## Tests

Run the suites of every package you touch, from that package's directory. CI runs one job per suite; the list is in `.github/workflows/ci.yaml`, and a new package with a `test` script needs a row there.

| Package | Commands |
|---|---|
| `rettangoli-fe` | `bun run test`, `bun run test:package`, `bun run test:browser` |
| `rettangoli-ui` | `bun run test`, `bun run check:contracts`, `bun run test:package`, `bun run test:browser` |
| `rettangoli-check` | `bun run test`, `bun run test:package` |
| `rettangoli-cli` | `bun run test`, `bun run test:package` |
| `rettangoli-vt`, `rettangoli-sites`, `rettangoli-sitekit` | `bun run test` |
| `examples/example1` | `node ../../packages/rettangoli-cli/cli.js fe build`, then `fe check`, then `check --dir fe/pages` |

Visual tests for `rettangoli-ui` and `rettangoli-sitekit` run in Docker (`ci-ui.yaml`, `ci-sitekit.yaml`).

## Changes and releases

- Work on a branch and open a pull request. Do not push to `main`. Pull requests are squash-merged, so the pull request title becomes the commit subject: use Conventional Commits with the package as scope, for example `feat(check): ...`.
- A change that alters a published package bumps that package's version in the same pull request. `rtgl` pins its sibling packages, so bump `rtgl` and update `bun.lock` when a package it depends on changes.
- Publishing is triggered by a tag on `main`: `fe-v*`, `ui-v*`, `check-v*`, `vt-v*`, `sites-v*`, `sitekit-v*`, and `cli-v*` for `rtgl`. Release `rtgl` last.
- Merging, tagging and creating releases are the maintainer's steps. Prepare them and stop.
