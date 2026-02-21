# Conformance Contract

This document defines how the scenario corpus binds to language specs.

## RTGL-SPEC-CONF-CORE-001: Scenario traceability requirement

1. Every `test/scenarios/*/expected.json` file must declare `specRefs`.
2. `specRefs` must be non-empty and only contain IDs listed in `spec-index.json`.
3. Missing/invalid `specRefs` is a scenario test failure.

## RTGL-SPEC-CONF-CORE-002: Deterministic analyzer behavior

For analyzer-mode scenarios, runner enforces:

1. repeated-run deterministic diagnostics
2. whitespace/noise mutation stability

## RTGL-SPEC-CONF-CLI-001: CLI scenario contract

CLI-mode scenarios validate command behavior via expected:

1. exit code
2. stderr/stdout exact text or subset includes
3. optional JSON-subset contracts (`stdoutJson`)
