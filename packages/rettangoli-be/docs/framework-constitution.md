# rettangoli-be Constitution

Status: draft

This is the source of truth for framework direction.

## Mission

Build an end-to-end backend framework for long-lived JSON-RPC APIs.

The framework must be simple, first-party controlled, agent-first, contract-driven,
SQLite-first, standards-compatible, strict in tooling, and boring at runtime.

## Rules

### 1. One Path

Prefer one obvious way over flexible configuration.

- fixed project layout;
- one folder per RPC method;
- one contract per method;
- one setup file;
- one request pipeline;
- one domain error shape;
- one CLI workflow for check, build, start, and test.

### 2. End-To-End Control

Rettangoli owns the first-party backend path:

- scaffolding, contracts, handlers, middleware, setup;
- SQLite conventions, tests, runtime, transport policy;
- extensions, generated registries, manifests;
- compatibility checks and diagnostics.

This is not a bag of utilities.

### 3. Build Framework Policy Ourselves

Write our own framework model:

- project discovery;
- registry generation;
- JSON-RPC dispatch rules;
- middleware composition;
- setup and lifecycle rules;
- checker rules;
- manifest generation;
- scaffolds;
- diagnostics.

Take inspiration from Koa-style middleware, but do not import another framework's app
model.

### 4. Use Libraries At Hard Boundaries

Use libraries where correctness, security, or protocol compliance is the job:

- HTTP primitives;
- JSON Schema validation;
- SQLite drivers;
- WebSocket protocol handling;
- cookie parsing/serialization;
- cryptography;
- YAML parsing;
- file watching.

Libraries can power the edges. Rettangoli owns the center.

### 5. Use Standards Where They Help

Use existing protocols instead of inventing formats:

- JSON-RPC 2.0;
- JSON Schema;
- HTTP;
- WebSocket;
- SQLite SQL;
- deterministic JSON manifests.

Support deliberate subsets. Unsupported protocol features should fail clearly.

### 6. Agent First

AI agents are primary framework users.

They are not just autocomplete. They inspect code, plan work, edit files, run
commands, use tools, spawn subagents, verify results, and produce reviewable changes.

The framework must support closed-loop agent work:

1. understand the app;
2. plan a change;
3. make the smallest valid edit;
4. run deterministic checks;
5. repair failures;
6. explain the result with evidence.

Agents should be able to self-close bounded tasks. The framework should give agents
explicit done criteria, deterministic checks, and evidence artifacts.

Long-running agent loops must resist drift. Agents should be able to run many
iterations, compact context, resume later, and stay anchored to the same contracts,
checks, manifests, and goal state.

The framework should also support parallel agents. Work should split into isolated
units such as one method, one module, one migration, one manifest change, or one
compatibility report. Parallel work should merge through deterministic checks, not
tribal knowledge.

Required agent surfaces:

- fixed, grep-able layout;
- isolated work units;
- complete scaffolds for new work;
- deterministic generated files and manifests;
- CLI commands that expose state;
- stable text and JSON output;
- one-command verification for a method, module, or whole app;
- resumable task state and machine-readable progress;
- checkpoints before risky edits;
- drift detection;
- dry-run modes for generated changes;
- safe defaults for commands with side effects;
- deterministic conflict and compatibility checks;
- checked examples;
- rule ids, method ids, file paths, and fixes in errors.

Agent-first means the framework reduces ambiguity, compresses context, exposes state,
lets agents work in parallel, and gives agents a reliable way to prove the work is
done.

### 7. SQLite First

Default docs, examples, tests, and tooling should assume SQLite.

Use local SQLite files for development, temporary DBs for tests, plain SQL migrations,
explicit transactions, and SQLite-compatible production options such as libSQL/Turso.

Do not become an ORM or multi-database abstraction.

### 8. Contracts Are Source Of Truth

RPC contracts define the public API.

Contracts are more important than implementation. Review should focus on contracts
first; handlers exist to satisfy contracts.

A complete method contract package includes:

- RPC schema;
- checked examples/spec tests;
- domain error codes;
- middleware requirements;
- auth and policy metadata when needed;
- manifest output;
- migration or database schema impact when data changes.

Contracts drive validation, generation, manifests, compatibility checks, docs, tests,
scaffolding, and implementation work.

If clients depend on it, put it in a contract or manifest.

Review order should be contract package first, implementation second.

### 9. API Longevity

APIs should evolve deliberately.

Manifests and compatibility checks should classify changes as safe, risky, or
breaking. Breaking changes must be explicit and reviewable.

### 10. Fail Fast

Invalid framework state should fail before serving traffic.

Errors must include the file path, method id, rule id, clear reason, and obvious fix
when possible.

### 11. Keep Runtime Boring

Runtime should be small and predictable.

Put power in checks, generation, manifests, scaffolds, compatibility tools, and
diagnostics before adding runtime abstraction.
