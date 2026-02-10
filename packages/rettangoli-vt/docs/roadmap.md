# Rettangoli VT Roadmap

Last updated: 2026-02-09

This file is the planning source of truth for `packages/rettangoli-vt`.

## Priority Model

- `P0` = release-critical / must-do next
- `P1` = high impact after P0
- `P2` = backlog / nice-to-have

## Top Priorities

### P0

- `Docker E2E test coverage`
  Status: in progress
  Goal: fully testable in-repo with Docker image build and verification.
  Scope: test suite that builds local Docker image, runs generate/report/accept in temp folders, validates all output artifacts.
  Notes: run with `bun run test:docker` (requires Docker daemon).
  Sub-tasks:
    - Deep output validation: validate screenshot WebP headers, non-zero file sizes, report.json schema, metrics.json schema, HTML content markers. (in progress)
    - Multi-spec multi-section fixture test: validate directory structure completeness across multiple section folders. (planned)
    - Error case matrix: missing config, missing vt section, invalid frontmatter. (planned)
    - Full baseline flow test with detailed report.json field-by-field validation (pixelmatch mode). (planned)
    - Multi-screenshot test: specs with `steps: [screenshot]` producing -01, -02 ordinals. (planned)
    - Fix existing test bug: `reportJson.mismatches` should be `reportJson.mismatched` + `reportJson.items`. (in progress)

- `Scoped runs (generate + report)`
  Status: planned
  Goal: run subsets without running everything.
  Scope: implement selectors `folder`, `group`, `item` for both commands.
  Notes: selector semantics are already documented (union/OR).

- `Release + Docker publish flow`  
  Status: planned  
  Goal: publish updated `@rettangoli/vt` and `rtgl`, then publish matching Docker image.  
  Scope: version bumps, dependency alignment, docker tag update, publish script run.

- `Selector test coverage`  
  Status: planned  
  Goal: lock selector behavior with unit and E2E tests.  
  Scope: folder prefix matching, group key resolution, item extension normalization, selector union behavior.

### P1

- `Selector UX hardening`  
  Status: backlog  
  Goal: clear errors when selector does not match anything; optional summary output by selected scope.

- `Report performance for scoped runs`  
  Status: backlog  
  Goal: avoid unnecessary diff work outside selected scope.

- `Default timeout tuning on real projects`  
  Status: backlog  
  Goal: validate current default (`30000ms`) against large real VT suites and adjust if needed.

### P2

- `Contributor quality-of-life`  
  Status: backlog  
  Goal: add helper scripts for common dev flows (`generate+report` scoped smoke).

- `Internal metrics/report ergonomics`  
  Status: backlog  
  Goal: improve human readability of metrics summary in CLI output.

- `Docs examples expansion`  
  Status: backlog  
  Goal: add more real-world selector examples for grouped sections and nested folders.

## Deferred / Not Planned

- Re-exposing broad internal capture tuning knobs (keep public surface small).
- Backward compatibility restoration for removed VT capture API.

