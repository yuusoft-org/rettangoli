# Scenario Tests

Each scenario is isolated in its own folder under `test/scenarios/<scenario-name>/`.

Structure per scenario:

- `src/components/**` => input files (`.view.yaml`, `.schema.yaml`, `.handlers.js`, etc.)
- `expected.json` => expected output contract:
  - required `specRefs`: non-empty array of spec IDs from `docs/language-spec/spec-index.json`
  - default analyzer mode:
    - `ok`
    - `errorCount`
    - `warnCount`
    - `errorCodes` (code -> count)
    - `warnCodes` (code -> count)
    - optional `diagnostics` array with exact diagnostic entries (`code`, `severity`, `message`, `filePath`, `line`)
  - optional CLI mode (`mode: "cli"`):
    - `exitCode`
    - optional `options.env` map for command-specific environment overrides
    - optional `stdout` / `stderr` exact strings
    - optional `stdoutIncludes` / `stderrIncludes` arrays
    - optional `stdoutJson` subset assertion

Default analyzer scenarios also enforce:

- deterministic repeatability (same diagnostics across repeated runs)
- formatting/noise mutation stability (same diagnostics after whitespace-noise mutation on `src/**`)
- spec traceability validity (`specRefs` must map to known language-spec IDs)

JS export differential parity (`oxc` vs `regex-legacy`) is validated separately by
`bun run --cwd packages/rettangoli-check test:diff-js-exports`.

## Scenarios (127)

1. `01-valid-minimal`
2. `02-missing-schema`
3. `03-forbidden-view-key`
4. `04-legacy-dot-prop`
5. `05-missing-handler-export`
6. `06-missing-action-export`
7. `07-schema-method-missing-export`
8. `08-listener-both-handler-action`
9. `09-yahtml-unknown-attr`
10. `10-duplicate-component-name`
11. `11-yahtml-global-attrs`
12. `12-commented-exports-ignored`
13. `13-quoted-selector-escaped-quotes`
14. `14-listener-invalid-symbol`
15. `15-schema-component-name-whitespace`
16. `16-listener-nonobject-config`
17. `17-constants-nonobject-root`
18. `18-cli-unknown-flag`
19. `19-cli-text-error-stderr`
20. `20-cli-json-success`
21. `21-warn-only-method-undocumented`
22. `22-cli-warn-as-error`
23. `23-yahtml-generic-camelcase-attrs`
24. `24-method-default-export-direct`
25. `25-list-lines-outside-template`
26. `26-schema-parse-error-line`
27. `27-project-schema-registry-cross-component`
28. `28-schema-contract-nonobject-properties`
29. `29-listener-option-type-validation`
30. `30-listener-option-valid-values`
31. `31-cli-help-precedence`
32. `32-cli-json-error-stdout`
33. `33-yahtml-global-popover-attr`
34. `34-cross-file-symbol-multi-export-declarators`
35. `35-selector-quoted-flow-value-colon`
36. `36-project-schema-registry-augments-ui-tag`
37. `37-listener-unknown-option`
38. `38-listener-flow-mapping-line-fallback`
39. `39-cli-json-thrown-error-stdout`
40. `40-cli-json-dir-file-path-error`
41. `41-yahtml-global-microdata-attrs`
42. `42-cross-file-symbol-export-star`
43. `43-selector-explicit-key-list`
44. `44-listener-nonobject-event-listeners`
45. `45-listener-handler-prefix`
46. `46-handlers-export-prefix`
47. `47-ref-invalid-key`
48. `48-ref-invalid-element-id-for-refs`
49. `49-jempl-template-parse-error`
50. `50-jempl-listener-payload-parse-error`
51. `51-yahtml-ast-fallback-control-flow`
52. `52-jempl-control-flow-mapping-child`
53. `53-yahtml-object-notation-global-attrs`
54. `54-yahtml-object-notation-unknown-attr`
55. `55-cross-file-symbol-export-star-typescript-target`
56. `56-yahtml-event-binding-attr-coverage`
57. `57-cross-file-symbol-invalid-named-reexport`
58. `58-yahtml-bare-legacy-prop-token`
59. `59-yahtml-bare-event-token-no-false-positive`
60. `60-cross-file-symbol-explicit-js-specifier-typescript-target`
61. `61-selector-explicit-key-multiline`
62. `62-missing-schema-prefers-view-file`
63. `63-project-schema-registry-duplicate-component-merges-props`
64. `64-project-schema-registry-trims-component-name-whitespace`
65. `65-listener-invalid-ref-key-short-circuits-listener-contract`
66. `66-cross-file-symbol-named-reexport-alias-valid`
67. `67-cross-file-symbol-default-reexport-alias-valid`
68. `68-cross-file-symbol-reexport-missing-target`
69. `69-cross-file-symbol-type-only-reexport-ignored`
70. `70-cross-file-symbol-export-star-cycle`
71. `71-expression-unresolved-template-root`
72. `72-lifecycle-before-mount-sync-only`
73. `73-compat-required-props`
74. `74-cli-sarif-success`
75. `75-cli-sarif-runtime-error`
76. `76-expression-loop-scope-resolved`
77. `77-expression-schema-path-invalid`
78. `78-expression-boolean-type-mismatch`
79. `79-lifecycle-on-update-missing-payload`
80. `80-compat-unsupported-event`
81. `81-compat-boolean-binding-type-mismatch`
82. `82-jempl-control-unknown-directive`
83. `83-jempl-control-for-signature-invalid`
84. `84-expression-loop-local-schema-path-invalid`
85. `85-expression-condition-operator-type-mismatch`
86. `86-expression-branch-loop-scope-boundary`
87. `87-expression-nested-loop-shadowing-resolved`
88. `88-expression-equality-operator-type-mismatch`
89. `89-cross-file-symbol-namespace-reexport-handler-alias-invalid`
90. `90-cross-file-symbol-destructured-export-bindings`
91. `91-cross-file-symbol-typescript-typed-export-declarations`
92. `92-cross-file-symbol-namespace-reexport-missing-target`
93. `93-cross-file-symbol-typescript-enum-export-invalid-handler-name`
94. `94-cross-file-symbol-default-name-reexport-missing-target`
95. `95-component-identity-noncanonical-folder`
96. `96-component-identity-file-stem-mismatch`
97. `97-cross-file-symbol-typescript-export-assignment-default-alias-valid`
98. `98-cross-file-symbol-default-function-reexport-alias-valid`
99. `99-cross-file-symbol-default-class-reexport-alias-valid`
100. `100-cross-file-symbol-default-reexport-symbol-missing`
101. `101-compat-prop-binding-type-mismatch`
102. `102-compat-prop-binding-type-match`
103. `103-lifecycle-on-update-payload-name-invalid`
104. `104-compat-event-handler-prefix-invalid`
105. `105-compat-event-handler-missing-export`
106. `106-compat-event-payload-contract-missing-param`
107. `107-listener-payload-contract-missing-key`
108. `108-expression-condition-schema-path-invalid`
109. `109-compat-required-prop-with-default`
110. `110-method-signature-nonobject-pattern-invalid`
111. `111-method-signature-extra-param-warn`
112. `112-method-payload-contract-missing-key`
113. `113-method-payload-contract-valid`
123. `123-cli-autofix-dry-run-json`
124. `124-cli-autofix-dry-run-patch-json`
125. `125-cli-autofix-apply-json-success`

## Run

```bash
node packages/rettangoli-check/test/run-scenarios.js
```

Or from package scripts:

```bash
cd packages/rettangoli-check
npm run test:scenarios
```

Additional FE/frontend contracts and parser/fuzz suites can be run from `packages/rettangoli-check/package.json` scripts as needed.
