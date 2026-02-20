# Diagnostics SARIF Contract

`rtgl-check --format sarif` emits SARIF `2.1.0` with deterministic ordering.

## Run-Level Contract

- `$schema`: `https://json.schemastore.org/sarif-2.1.0.json`
- `version`: `2.1.0`
- one run with:
  - `tool.driver.name = "@rettangoli/check"`
  - `tool.driver.rules[]` generated from diagnostics catalog metadata
  - `results[]` sorted deterministically by code/severity/location/message

## Rule Contract

Each SARIF rule includes:

- `id` = diagnostic code
- `shortDescription.text` and `fullDescription.text`
- `helpUri` = diagnostics docs anchor
- `defaultConfiguration.level` from default severity
- `properties.tags`, `properties.category`, `properties.namespaceValid`

## Result Contract

Each SARIF result includes:

- `ruleId`, `level`, `message.text`
- `locations[0].physicalLocation` (relative URI and region when available)
- `partialFingerprints.primaryLocationLineHash` (stable hash)
- optional `relatedLocations[]`
- optional `codeFlows[]` for trace propagation
- optional `properties.autofix` metadata when fix hints are present
