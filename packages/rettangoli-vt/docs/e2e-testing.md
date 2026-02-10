# E2E Testing

Folder-based snapshot testing. Each scenario is a directory containing real project files and expected output at each step.

Zero dependencies. Single standalone JS file. Uses only Node.js built-ins (`fs`, `path`, `child_process`, `os`). Runs as a CLI command — not tied to any test framework. Agnostic to what commands are run (Docker, local, anything).

Note:

- This document covers the folder-based runner at `e2e/run.js`.
- Separate Vitest smoke tests exist at `spec/e2e-smoke.spec.js`.
- Those smoke tests are skipped by default and only run when `VT_E2E=1`.

## How it works

1. Delete `{scenario}/.work/` if it exists.
2. Copy `initial/` to `{scenario}/.work/`.
3. For each step in `scenario.yaml`:
   - Run the command with `$CWD` replaced by the absolute path to `.work/`.
   - Compare the full directory tree of `.work/` against the expected step folder.
4. If every step matches, delete `.work/` and the scenario passes.
5. If any step fails, leave `.work/` in place for inspection.
6. Exit code 0 = all pass, exit code 1 = any failure.

## Folder structure

```
e2e/
  run.js                          # the runner (standalone, zero dependencies)
  {scenario-name}/
    scenario.yaml
    initial/                      # starting project files
    step1/                        # expected full tree after command 1
    step2/                        # expected full tree after command 2
    ...
```

Every step folder contains the **complete** expected directory tree — both the original project files and the generated output. Nothing is implicit.

## scenario.yaml

```yaml
dynamicFields:
  - timestamp
  - generatedAt
  - "*Ms"
  - workerUtilization

steps:
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt generate
    expected: step1
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt report
    expectFail: true
    expected: step2
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt accept
    expected: step3
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt report
    expected: step4
```

Fields:

- `dynamicFields` — list of JSON key patterns to strip before comparing `.json` files. Exact match by default. Prefix with `*` for suffix matching (e.g. `*Ms` matches `durationMs`, `totalMs`, etc.). Configured per scenario — the runner has no hardcoded field names.
- `steps` — ordered list of steps to execute.
  - `command` — any shell command. `$CWD` is replaced with the absolute path to the temp working directory.
  - `expected` — name of the folder containing the expected tree for this step.
  - `expectFail` — (optional, default `false`) if `true`, the command is expected to exit with a non-zero code. The step still passes as long as the directory tree matches.

## File comparison rules

The runner compares every file in the expected tree against the actual tree.

| File type | How compared |
|-----------|-------------|
| `.webp` | Binary exact match. |
| `.json` | Parsed and compared with dynamic fields stripped (as configured in `scenario.yaml`). |
| Everything else (`.html`, `.yaml`, `.css`, etc.) | Text exact match. |

An extra file in the actual tree that is not in the expected tree **fails** the test. A missing file also fails.

## Running

```bash
# Full pipeline: build Docker image + run all E2E scenarios
bun run test:docker:full

# Run the E2E runner directly (image must already exist)
node e2e/run.js
```

## Adding a new scenario

1. Create a new folder under `e2e/`:

```
e2e/my-new-scenario/
  scenario.yaml
  initial/
```

2. Put real project files in `initial/` — config, specs, any static files.

3. Write `scenario.yaml` with the commands, step names, and dynamic fields for that scenario.

4. Generate the expected step folders. The easiest way:

```bash
# Copy initial to a temp dir, run commands manually, then copy back
cp -r e2e/my-new-scenario/initial /tmp/scenario-run
docker run --rm -v /tmp/scenario-run:/workspace -w /workspace rtgl-local-test:latest rtgl vt generate
cp -r /tmp/scenario-run e2e/my-new-scenario/step1

# Continue for step2, step3, etc.
```

5. Review the step folders. Open screenshots, check JSON files, make sure everything looks right.

6. Run the tests to confirm they pass.

## Updating expected output

When VT behavior changes intentionally (new output files, different report format, etc.):

1. Delete the old step folders.
2. Re-generate them using the manual process above.
3. Review the diff before committing.

## Implementation

### Files to create

1. `e2e/run.js` — standalone runner, zero dependencies, uses only Node.js built-ins
2. `e2e/basic-generate-report/scenario.yaml` — first scenario definition
3. `e2e/basic-generate-report/initial/` — starting project files
4. `e2e/basic-generate-report/step1/` through `step4/` — expected output snapshots (generated from running commands, not hand-written)

### Runner (`e2e/run.js`)

Standalone Node.js script. No imports except built-ins.

```
#!/usr/bin/env node

imports: fs, path, child_process (execSync)

main():
  e2eDir = directory where run.js lives
  scenarioDirs = list subdirectories of e2eDir that contain scenario.yaml

  totalScenarios = 0
  passed = 0
  failed = 0
  failures = []

  for each scenarioDir in scenarioDirs:
    totalScenarios++
    scenarioName = basename(scenarioDir)
    print "Running scenario: {scenarioName}"

    scenario = parseYaml(read(scenarioDir/scenario.yaml))
    dynamicFields = scenario.dynamicFields or []
    workDir = path.join(scenarioDir, ".work")

    # Clean slate
    rm -rf workDir
    copyDirRecursive(scenarioDir/initial, workDir)

    scenarioPassed = true

    for each step in scenario.steps:
      print "  Step: {step.command} → {step.expected}"

      # Run command (replace $CWD with absolute workDir path)
      resolvedCommand = step.command.replaceAll("$CWD", path.resolve(workDir))
      exitCode = runCommand(resolvedCommand, workDir)

      if step.expectFail and exitCode === 0:
        record failure: "expected command to fail but it succeeded"
        scenarioPassed = false
        break
      if !step.expectFail and exitCode !== 0:
        record failure: "command failed with exit code {exitCode}"
        scenarioPassed = false
        break

      # Compare directories
      expectedDir = path.join(scenarioDir, step.expected)
      result = compareDirectories(workDir, expectedDir, dynamicFields)

      if result.errors.length > 0:
        record failure with result.errors
        scenarioPassed = false
        break

      print "    PASS"

    if scenarioPassed:
      passed++
      rm -rf workDir          # clean up on success
    else:
      failed++
      add to failures[]       # leave .work/ for inspection

  # Print summary
  print ""
  print "Results: {passed}/{totalScenarios} passed"
  if failures:
    for each failure: print details
    exit(1)
  else:
    exit(0)
```

### `parseYaml(text)` — minimal YAML parser

Only needs to handle the `scenario.yaml` format. No dependency on `js-yaml`.

```
Split by lines.
Two sections to parse:

1. dynamicFields (list of strings):
   When line is "dynamicFields:" → enter dynamicFields mode
   Each "  - value" line → push value to dynamicFields array
   Stop when hitting a non-list line

2. steps (list of objects):
   When line is "steps:" → enter steps mode
   "  - command: ..." → new step object with command
   "    expected: ..." → set expected on current step
   "    expectFail: true" → set expectFail=true on current step

Return { dynamicFields: [...], steps: [...] }
```

This is not a general YAML parser — it only handles the specific format used by `scenario.yaml`.

### `compareDirectories(actualDir, expectedDir, dynamicFields)` function

```
1. Walk expectedDir recursively → sorted array of relative paths
2. Walk actualDir recursively → sorted array of relative paths
3. Compute:
   - missing = in expected but not in actual
   - extra = in actual but not in expected
4. errors = []
5. For missing: push "MISSING: {path}"
6. For extra: push "EXTRA: {path}"
7. For each file present in both:
   - if .webp:
       read both as Buffer
       if !buffer.equals(): push "CONTENT MISMATCH (binary): {path}"
   - if .json:
       parse both
       strip dynamic fields from both (using dynamicFields config)
       if JSON.stringify(a) !== JSON.stringify(b):
         push "CONTENT MISMATCH (json): {path}\n  expected: {snippet}\n  actual: {snippet}"
   - else:
       read both as utf8 string
       if a !== b: push "CONTENT MISMATCH (text): {path}"
8. Return { errors }
```

### `stripDynamicFields(obj, dynamicFields)` function

```
if obj is not object or is null: return obj
if Array.isArray(obj): return obj.map(item => stripDynamicFields(item, dynamicFields))

result = {}
for each [key, value] of Object.entries(obj):
  skip if shouldStrip(key, dynamicFields)
  result[key] = stripDynamicFields(value, dynamicFields)
return result
```

### `shouldStrip(key, dynamicFields)` function

```
for each pattern in dynamicFields:
  if pattern starts with "*":
    suffix = pattern.slice(1)
    if key ends with suffix: return true
  else:
    if key === pattern: return true
return false
```

### `walkDir(dir)` function

```
result = []
function walk(current):
  for each entry in readdirSync(current):
    fullPath = join(current, entry)
    if isDirectory: walk(fullPath)
    else: result.push(relative(dir, fullPath) using forward slashes)
return result.sort()
```

### `copyDirRecursive(src, dest)` function

```
use fs.cpSync(src, dest, { recursive: true })
```

### `runCommand(command, cwd)` function

```
try:
  execSync(command, { cwd, encoding: "utf-8", stdio: "pipe" })
  return 0
catch (err):
  return err.status || 1
```

### First scenario: `basic-generate-report`

`e2e/basic-generate-report/scenario.yaml`:
```yaml
dynamicFields:
  - timestamp
  - generatedAt
  - "*Ms"
  - workerUtilization

steps:
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt generate
    expected: step1
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt report
    expectFail: true
    expected: step2
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt accept
    expected: step3
  - command: docker run --rm -v "$CWD:/workspace" -w /workspace rtgl-local-test:latest rtgl vt report
    expected: step4
```

`e2e/basic-generate-report/initial/rettangoli.config.yaml`:
```yaml
vt:
  path: ./vt
  compareMethod: md5
  sections:
    - title: components_basic
      files: components
```

`e2e/basic-generate-report/initial/vt/specs/components/basic.html`:
```html
---
title: basic_component
---
<div style="width:360px;height:220px;padding:24px;background:#2c7be5;color:#fff;font:700 42px Arial;">
  Hello World
</div>
```

Step folders (`step1/` through `step4/`) are generated by running the commands and copying the results back. They are NOT hand-written:

```bash
# Generate step snapshots for basic-generate-report
SCENARIO=e2e/basic-generate-report
WORK=/tmp/e2e-snapshot-run

# Start from initial
rm -rf "$WORK" && cp -r "$SCENARIO/initial" "$WORK"

# Step 1: generate
docker run --rm -v "$WORK:/workspace" -w /workspace rtgl-local-test:latest rtgl vt generate
rm -rf "$SCENARIO/step1" && cp -r "$WORK" "$SCENARIO/step1"

# Step 2: report (expect fail)
docker run --rm -v "$WORK:/workspace" -w /workspace rtgl-local-test:latest rtgl vt report || true
rm -rf "$SCENARIO/step2" && cp -r "$WORK" "$SCENARIO/step2"

# Step 3: accept
docker run --rm -v "$WORK:/workspace" -w /workspace rtgl-local-test:latest rtgl vt accept
rm -rf "$SCENARIO/step3" && cp -r "$WORK" "$SCENARIO/step3"

# Step 4: report (pass)
docker run --rm -v "$WORK:/workspace" -w /workspace rtgl-local-test:latest rtgl vt report
rm -rf "$SCENARIO/step4" && cp -r "$WORK" "$SCENARIO/step4"

rm -rf "$WORK"
```

### Error output format

When a step fails, the runner prints:

```
FAIL: basic-generate-report > step1 (docker run ... rtgl vt generate)
  MISSING: .rettangoli/vt/_site/candidate/components/basic-01.webp
  EXTRA: .rettangoli/vt/_site/candidate/components/basic-01.png
  CONTENT MISMATCH (json): .rettangoli/vt/report.json
    expected: {"total":1,"mismatched":0,"items":[]}
    actual:   {"total":1,"mismatched":1,"items":[...]}
```

### Summary output

```
Results: 1/1 passed
```

or:

```
Results: 0/1 passed

FAILURES:
  basic-generate-report > step1 (docker run ... rtgl vt generate)
    MISSING: .rettangoli/vt/_site/candidate/components/basic-01.webp
```

### package.json scripts

```json
"test:docker": "node e2e/run.js",
"test:docker:full": "bash scripts/docker-e2e-test.sh"
```

`test:docker:full` builds the Docker image then calls `node e2e/run.js`.
`test:docker` runs the E2E runner directly (image must already exist).
