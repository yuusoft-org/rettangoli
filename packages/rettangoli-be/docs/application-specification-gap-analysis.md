# Application Specification Gap Analysis

Status: draft

The live normative contract format is in `application-specification.md`.

This compares the current `application-specification.md` against the ideal end-state
for `rettangoli-be`.

The question is not "what can the current implementation do?" The question is "what
should the ultimate contract-first, agent-first framework specify?"

## Summary

The current specification is a good file-format and convention spec.

The ideal specification should become a full contract system spec.

Current spec:

- defines folder layout;
- defines `.contract.yaml`;
- defines `.examples.yaml`;
- defines handlers and middleware;
- defines setup/context basics;
- defines checker expectations.

Ideal spec:

- defines the complete method contract package;
- treats tests as executable contract examples;
- defines public error codes explicitly;
- generates a manifest that is the canonical API artifact;
- supports compatibility checks across time;
- supports long-running and parallel AI agent loops;
- gives agents deterministic proof that work is complete.

## 1. Contract Package

Current spec says each method has:

```txt
<action>.handlers.js
<action>.contract.yaml
<action>.examples.yaml
```

Ideal spec should define a richer method contract package:

```txt
src/modules/<domain>/<action>/
  <action>.contract.yaml
  <action>.examples.yaml
  <action>.handlers.js
```

Logical contract contents:

- method id;
- summary and description;
- params schema;
- result schema;
- domain error catalog;
- middleware requirements;
- executable examples/spec cases;
- generated manifest entry.

Implementation should be the last item reviewed, not the center of the package.

## 2. RPC YAML

Current `.contract.yaml` is enough for basic runtime validation.

Ideal `.contract.yaml` should describe the public API contract more completely:

```yaml
method: user.getProfile
summary: Get profile
description: Return the authenticated user profile.
middleware:
  before: [withAuthUser]
  after: [withLogger]
paramsSchema:
  type: object
  additionalProperties: false
  properties: {}
  required: []
resultSchema:
  type: object
  additionalProperties: false
  properties:
    id:
      type: string
    email:
      type: string
    role:
      type: string
  required: [id, email, role]
errors:
  AUTH_REQUIRED:
    description: Session is missing or invalid.
    detailsSchema:
      type: object
      additionalProperties: false
      properties:
        reason:
          const: auth_required
      required: [reason]
  USER_NOT_FOUND:
    description: Authenticated user no longer exists.
    detailsSchema:
      type: object
      additionalProperties: false
      properties:
        userId:
          type: string
      required: [userId]
```

In the ideal spec, `errors` is the authoritative domain error catalog. A generated
`errorSchema` can be derived from it.

## 3. Spec YAML Tests

Current `.examples.yaml` should be executable runtime contract examples.

Each case should declare which contract branch it proves:

```yaml
case: requires-auth
proves:
  error: AUTH_REQUIRED
in:
  - request:
      id: auth
      params: {}
out:
  error:
    code: -32000
    message: Domain error
    data:
      code: AUTH_REQUIRED
      details:
        reason: auth_required
```

Ideal checker rules:

- every request `params` validates against `paramsSchema`;
- every success `out.result` validates against `resultSchema`;
- every error `out.error.data.code` exists in `errors`;
- every error `out.error.data.details` validates against that error's `detailsSchema`;
- every error in `errors` has at least one proving spec case;
- every public example can run as a test;
- deterministic runtime setup proves expected dependency behavior when relevant.

This makes tests part of the contract, not just implementation verification.

## 4. Manifest

Current spec mentions a generated manifest.

Ideal manifest should be the canonical API artifact for agents, reviews, and
compatibility checks.

Manifest should include:

- framework version;
- app name and version;
- method ids;
- contract hashes;
- params/result schemas;
- error catalog;
- middleware list;
- example/spec coverage summary;

Agents should use the manifest to understand the API without loading every source
file into context.

## 5. Compatibility

Current spec says compatibility checks should exist.

Ideal spec should define compatibility semantics.

Breaking changes:

- removing a method;
- changing method id;
- adding required params;
- narrowing params;
- removing result fields;
- changing result field types;
- removing error codes;
- changing error details incompatibly.

Risky changes:

- adding optional params;
- adding result fields;
- adding error codes;
- loosening schemas;
- changing middleware.

Safe changes:

- description changes;
- adding examples;
- widening result schema when clients are unaffected.

Breaking changes should require explicit review metadata.

## 6. Agent Workflows

Current spec lists target commands.

Ideal spec should define closed-loop agent workflows.

For a method change, an agent should be able to run:

```bash
rtgl be explain user.getProfile --json
rtgl be check --method user.getProfile --json
rtgl be test --method user.getProfile --json
rtgl be manifest --json
rtgl be compat --from base.json --to current.json --json
rtgl be verify --method user.getProfile --json
```

Ideal `verify` output should say:

- contract valid;
- examples valid;
- implementation satisfies contract;
- manifest updated;
- compatibility status;
- generated files clean;
- done criteria satisfied.

This is what lets agents self-close long-running loops.

## 7. Parallel Agents

Current spec says method packages are work units.

Ideal spec should define merge boundaries.

Parallel-safe units:

- one method package;
- one middleware;
- one migration;
- one domain manifest section;
- one compatibility report.

Ideal checker rules:

- detect conflicting method ids;
- detect conflicting migrations;
- detect stale generated manifests;
- detect stale client output;
- detect incompatible contract changes;
- produce machine-readable conflict reports.

## 8. SQLite

Current spec says SQLite first.

Ideal spec should define how API contracts connect to data changes.

Method contracts should optionally declare:

```yaml
database:
  reads:
    - users
  writes: []
  migrations:
    required: []
```

Migration metadata should be checkable:

- ordered filename;
- stable id;
- checksum;
- up SQL;
- optional down SQL if chosen;
- tables affected;
- whether destructive.

The framework should not become an ORM, but it should understand enough SQLite
metadata to protect agent workflows and compatibility review.

## 9. Runtime

Current spec describes handler and JSON-RPC behavior.

Ideal runtime spec should be derived from contracts:

- startup validates all contracts;
- dispatch validates params;
- handler output validates result/error;
- domain errors map from error catalog;
- unknown domain errors fail loudly;
- readiness reflects declared dependencies;
- observability events include method id, contract hash, error code, and duration.

Runtime should stay small. The contract system should carry the power.

## 10. What To Improve In `application-specification.md`

Recommended next edits:

1. Replace generic `errorSchema` as the primary public error definition with an
   `errors` catalog.
2. Define spec YAML cases as executable contract examples with `proves`.
3. Require checker validation between `.contract.yaml` and `.examples.yaml`.
4. Define generated manifest shape in more detail.
5. Add compatibility classification rules.
6. Add agent `verify` proof output.
7. Split current implementation notes from ideal target requirements.

The ideal direction is clear: the framework should review contracts first, generate
truth from contracts, and use implementation only to satisfy contracts.
