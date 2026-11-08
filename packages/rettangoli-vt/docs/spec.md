# Rettangoli VT Spec

Last updated: 2026-11-06

This document defines the public contract for `rtgl vt`.

## Scope

- `rtgl vt generate`
- `rtgl vt screenshot`
- `rtgl vt report`
- `rtgl vt accept`

Capture engine internals are intentionally excluded from this contract. The
[Contracts](#contracts) section lists the behavior that consumers rely on beyond the CLI.

## Config Contract

`rettangoli.config.yaml`:

```yaml
vt:
  path: ./vt
  url: http://localhost:3000
  service:
    start: bun run preview
  compareMethod: pixelmatch # pixelmatch | md5
  colorThreshold: 0.1
  diffThreshold: 0.3
  port: 3001
  concurrency: 4
  timeout: 30000
  waitEvent: vt:ready
  isolationMode: strict
  animations: disabled # allow | disabled
  launchArgs:
    - --use-gl=angle
  viewport:
    id: desktop
    width: 1280
    height: 720
  sections:
    - title: Components Basic
      files: components
```

Rules:

- `vt` must be an object.
- `vt.sections` is required and non-empty.
- Each flat section requires `title` and `files`.
- Group section requires `type: groupLabel` and non-empty `items`.
- Section page keys are derived from section titles as `kebab-case(title)`.
- Derived section page keys must be unique case-insensitively.
- `vt.path` optional non-empty string. Default: `./vt`.
- `vt.port` optional integer 1-65535 for the built-in capture server. Default: `3001`.
- `vt.concurrency` optional integer >= 1. Default: chosen from the machine's CPUs and memory.
- `vt.timeout` optional integer >= 1 (ms). Default: `30000`.
- `vt.waitEvent` optional non-empty string.
- `vt.isolationMode` optional `fast` or `strict`. Default: `fast`.
- `vt.animations` optional `allow` or `disabled`. Default: not set (Playwright's default, `allow`).
- `vt.launchArgs` optional array of non-empty strings, added to Chromium's launch arguments.
- `vt.compareMethod` optional `pixelmatch` or `md5`. Default: `pixelmatch`.
- `vt.colorThreshold` optional number 0-1. Default: `0.1`.
- `vt.diffThreshold` optional number 0-100 (percent of pixels). Default: `0.3`.
- `vt.viewport` optional object or array of objects.
- each viewport object requires `id`, `width`, `height`.
- viewport `id` values must be unique case-insensitively within an array.
- `vt.url` optional string. It should be an absolute `http://` or `https://` URL; VT prints a warning otherwise.
- `vt.service` optional object with required `start` command string.
- when `vt.service` is set, `vt.url` is required.
- `vt.capture` must be omitted or empty object.
- Removed capture keys (`screenshotWaitTime`, `waitSelector`, `waitStrategy`, `workerCount`, `navigationTimeout`, `readyTimeout`, `screenshotTimeout`, `maxRetries`, `recycleEvery`, `metricsPath`, `headless`) fail validation.
- Other unknown keys are ignored with a warning (`vt.isolation` suggests `vt.isolationMode`).

Environment:

- `RTGL_CHROMIUM_ARGS`: whitespace-separated Chromium arguments, added after `vt.launchArgs`.
- `RTGL_VT_*`: injected into every page; see [Contracts](#contracts).

## Generate CLI Contract

Supported options:

- `--headed`
- `--concurrency <number>`
- `--timeout <ms>`
- `--wait-event <name>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

`--headed`, `--concurrency`, `--timeout` and `--wait-event` have no effect on `generate`, which
never starts a browser.

Generate behavior:

- Builds candidate pages from `vt/specs` into `.rettangoli/vt/_site/candidate`.
- Builds section overview pages from `vt.sections`.
- Does not capture screenshots.
- Writes the capture manifest `.rettangoli/vt/_site/candidate/.vt-capture.json` with `"screenshots": false`.

Scope filtering:

- Every spec page is generated, whatever the selectors.
- Selectors are validated (an unknown `--group` fails), reported as `Selector scope: N file(s) selected, M excluded.`, and recorded in the capture manifest.
- Multiple selectors are unioned (OR).
- No selector means full run.

Examples:

```bash
rtgl vt generate --folder components/forms
rtgl vt generate --group components-basic
rtgl vt generate --item components/forms/login
rtgl vt generate --item components/forms/login.html
rtgl vt generate --group components-basic --item pages/home
```

## Screenshot CLI Contract

Supported options:

- `--headed`
- `--concurrency <number>`
- `--timeout <ms>`
- `--wait-event <name>`
- `--isolation <fast|strict>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

CLI options win over the matching config keys.

Screenshot behavior:

- Builds candidate pages from `vt/specs`.
- Builds section overview pages from `vt.sections`.
- Writes the capture manifest `_site/candidate/.vt-capture.json` (`"screenshots": true` and the selector scope) before capturing.
- Captures screenshots for non-`skipScreenshot` specs.
- Takes an immediate initial screenshot before running `steps` unless `frontmatter.skipInitialScreenshot=true`.
- when `vt.service.start` exists, starts service, waits for `vt.url`, then stops service after capture.
  - Before starting it, VT sends one request to `vt.url` (1 s limit). If something already answers, VT warns that it may capture that server instead of the managed one, and continues.
  - Readiness: any HTTP answer from `vt.url`, within 120 s. A service that exits first fails the run at once.
  - Ctrl+C during readiness stops the service; the run exits with status 130.
- when `vt.service` is omitted and `vt.url` is set, VT captures against the already running service.
- when `vt.url` is not set, VT serves `.rettangoli/vt/_site` and `vt/static` on `vt.port` and captures `/candidate/<spec>.html`.
- isolation defaults to `fast`.
- `strict` uses a fresh browser context per capture task and is recommended for IndexedDB-backed app state or direct app-route capture.
- the built-in template loads `vt/static/public/main.js` exactly once as an ES module at `/public/main.js`.
- custom templates own their script entry points and formats.
- an uncaught page exception is a capture failure; VT does not silently accept a screenshot from an errored page.
- a page VT generated that answers HTTP 4xx or 5xx fails its task (pages from `vt.url` or frontmatter `url` are not checked).
- a step that can never run (for example `focus` outside a select block) fails its task at once, without navigating and without a retry.
- a page evaluation that does not finish (a blocked main thread, a promise that never settles) fails its task after the timeout instead of hanging the run.
- a failed task is retried once.
- Fails if unresolved capture failures remain.

Wait strategy precedence:

- `frontmatter.waitStrategy`
- inferred from `frontmatter.waitEvent` / `frontmatter.waitSelector`
- runtime default: if a wait event is set (`--wait-event`, else `vt.waitEvent`), uses `event`; otherwise uses `load`
- `waitStrategy: event` without `frontmatter.waitEvent` uses `--wait-event` / `vt.waitEvent`; with neither set, the capture fails before the browser starts.
- `event` waits for `load`, then for the named event on `window` (VT registers the listener before the page's scripts run).

Animations:

- `animations: disabled` (frontmatter, else `vt.animations`) passes Playwright's `animations: "disabled"` to every screenshot of the spec: finite CSS animations and transitions jump to their end state, infinite ones go back to their start.
- Not set (the default) or `allow`: screenshots are taken as before.
- Screenshots from `window.takeVtScreenshotBase64()` ignore it.

Scope filtering:

- Applies before screenshot capture.
- Multiple selectors are unioned (OR).
- No selector means full run.

Examples:

```bash
rtgl vt screenshot --folder components/forms
rtgl vt screenshot --group components-basic
rtgl vt screenshot --item components/forms/login
rtgl vt screenshot --item components/forms/login.html
rtgl vt screenshot --group components-basic --item pages/home
```

## Report CLI Contract

Supported options:

- `--compare-method <method>`
- `--color-threshold <number>`
- `--diff-threshold <number>`
- `--folder <path>` (repeatable)
- `--group <section-key>` (repeatable)
- `--item <spec-path>` (repeatable)

Scope filtering:

- Uses the same selector model as `screenshot`.
- Filters candidate/reference comparison set before mismatch evaluation.

Examples:

```bash
rtgl vt report --folder components/forms
rtgl vt report --group components-basic
rtgl vt report --item components/forms/login
```

## Accept CLI Contract

- Reads `.rettangoli/vt/report.json`; fails when it is missing.
- Copies the candidate of every listed item to `vt/reference`.
- Deletes a reference whose candidate does not exist ("only in reference"), unless the last capture did not cover it: after an HTML-only `generate`, or outside a scoped run's selectors, it keeps the reference and prints `Kept N reference image(s) outside the last capture scope; run a full "rtgl vt screenshot" to prune them.`.
- The scope comes from the latest capture manifest, not from the run that wrote report.json. A report that is older than the last `generate` is not detected.
- Without a manifest (candidates from an older VT), every reference-only item is deleted.
- Items whose candidate has disappeared since the report are skipped with a warning.

## Frontmatter Contract

Keys VT reads:

- `title`
- `description`
- `template`
- `url`
- `waitEvent`
- `waitSelector`
- `waitStrategy` (`networkidle` | `load` | `event` | `selector`)
- `viewport` (object or array of viewport objects)
- `skipScreenshot` (boolean)
- `skipInitialScreenshot` (boolean)
- `animations` (`allow` | `disabled`)
- `diffThreshold` (number 0-100; `report` with `pixelmatch` uses it for this spec's screenshots)
- `specs` (array of non-empty strings)
- `steps` (array of structured action objects)

Other keys are accepted and passed to templates as `frontMatter.<key>`. `skipScreenshots` prints
a warning (did you mean `skipScreenshot`?) because VT ignores it and captures the spec.

Step action reference:

- `docs/step-actions.md`
- `assert` uses `action: assert` and supports `js` deep-equal checks (including object/array values).

Validation:

- `waitStrategy=selector` requires `waitSelector`.
- Structured steps require `action`.
- `action: select` is the only nested/block action, requires `steps`, and accepts exactly one of `testId` or `selector`.
- `skipInitialScreenshot=true` disables only the immediate pre-step screenshot; explicit `action: screenshot` steps still run.
- Frontmatter `url` resolves against `vt.url` (or the built-in server). When `vt.url` is set, VT captures that URL (or the frontmatter `url`), not the generated spec page.

## Spec Files

- Every file under `vt/specs` is a spec, except names that start with `.`, end with `~`, or look like `#name#` (and everything under such a directory).
- Discovery is depth-first with siblings in UTF-8 byte order, on every runtime.
- A spec generates `candidate/<path>.html` (`.html` specs keep their name; other extensions become `.html`). Two specs that generate the same page (`a.html` and `a.yaml`) fail `generate`, naming both.
- Two specs that produce the same screenshot name (`btn--mobile.html` next to `btn.html` with a `mobile` viewport) fail the capture, naming both.
- Spec names may contain spaces, non-ASCII characters, `%`, `#` and `?`; the built-in server decodes request paths.

## Screenshot Naming Contract

- Screenshot filenames are `<base>-NN.webp`.
- First captured image is `-01`.
- Sequence increments `-02`, `-03`, ... up to `-99`.
- When viewport id is configured, filenames include `--<viewportId>` before ordinal.
  Example: `pages/home--mobile-01.webp`.

## Report Contract

Report command:

- compares candidate vs reference screenshots
- does not run `generate` or `screenshot`
- writes HTML report: `.rettangoli/vt/_site/report.html`
- writes JSON report: `.rettangoli/vt/report.json`, before failing on mismatches
- fails when mismatches exist
- creates `vt/reference` when it does not exist

Selectors:

- `folder`: folder prefix under `vt/specs`
- `group`: section page key from `vt.sections`
- `item`: single spec path relative to `vt/specs` (extension optional)

A screenshot maps to its spec by name: `pages/btn--mobile-01.webp` belongs to `pages/btn`, unless
a spec named `pages/btn--mobile` exists.

Compare methods:

- `md5` exact match
- `pixelmatch` threshold-based comparison: an image passes when no pixel differs, or when the percentage of differing pixels is below the diff threshold. A spec's frontmatter `diffThreshold` overrides `--diff-threshold` / `vt.diffThreshold` for its screenshots.

## Warnings

VT prints `[vt] Warning:` lines on stderr for runs that are probably not what was meant. They never
change the exit status, the files written or the comparison result.

- `generate`, `screenshot` and `report`: the specs directory (`<vt.path>/specs`) does not exist.
- `generate` and `screenshot`: a `--folder` or `--item` matches no spec.
- `report`: a `--folder` or `--item` matches no image, or the selected scope contains no image.
- An unknown `vt` config key, or a `vt.url` that is not an absolute http(s) URL.
- A spec's frontmatter has `skipScreenshots`.
- `screenshot`: something already answers at `vt.url` before `vt.service.start` runs.

## Artifact Paths

- Candidate: `.rettangoli/vt/_site/candidate`
- Capture manifest: `.rettangoli/vt/_site/candidate/.vt-capture.json`
- Reference mirror for report: `.rettangoli/vt/_site/reference`
- Diff images: `.rettangoli/vt/_site/diff`
- Report HTML: `.rettangoli/vt/_site/report.html`
- Report JSON: `.rettangoli/vt/report.json`
- Capture metrics: `.rettangoli/vt/metrics.json`
- References: `vt/reference`

## Contracts

Consumers depend on the following behavior. Changing any of it is a breaking change; each item
is pinned by a test under `spec/`.

Package and modules:

- `@rettangoli/vt` exports `.` (`src/index.js`, empty) and `./cli` (`src/cli/index.js`) with `generate`, `screenshot`, `report`, `accept`, `createRettangoliVtWatchPlugin`, `generateVtWatchSite`, `generateVtWatchSpec` and `generateVtWatchSpecs`. The three `generateVtWatch*` functions are internal to `rtgl fe watch`.
- `src/createSteps.js` is deep-imported by consumers. It keeps exporting `createSteps(page, context?)`; `context` may be omitted or `{}`. `executeStep(step)` accepts raw, unvalidated YAML steps. The module and everything it imports use no third-party packages.
- `src/capture/capture-scheduler.js` contains the line `const browser = await chromium.launch({ headless });` exactly once. Some CI setups patch it with `sed` to add Chromium arguments; `vt.launchArgs` and `RTGL_CHROMIUM_ARGS` are the supported way, and they are added after any arguments such a patch puts on that line.

Pages under capture:

- Every `RTGL_VT_*` environment variable is set as a string-valued `window` global on every page (for example `RTGL_VT_RESET_APP_STATE`, `RTGL_VT_DEBUG`, `RTGL_VT_INCLUDE_MEDIA`).
- When the page defines `window.takeVtScreenshotBase64()`, VT uses it instead of a Playwright screenshot. It may return a value or a promise, as a PNG data URL or raw base64.
- `customEvent` dispatches `new CustomEvent(name, { detail })` on `window`; every `detail` value is a string, non-strings JSON-encoded.
- `select` targets the first descendant matching `input, textarea, button, select, a`, else the host.
- The legacy block form `{"<command> <args>": [steps]}` stays accepted.
- Pages render with `colorScheme: light`, `reducedMotion: reduce` and `forcedColors: none`, with a font-smoothing style (`#__rtgl_vt_rendering_style`) that an init script adds to every document.
- Screenshots are full-page PNGs converted to WebP at quality 85.

Output:

- Screenshot names `<base>-NN.webp` and `<base>--<viewportId>-NN.webp` (01-99); the initial screenshot unless `skipInitialScreenshot`.
- The layout under [Artifact Paths](#artifact-paths). report.json keeps its shape, including the `candidate/` and `reference/` path prefixes.
- `screenshot` fails when any capture fails; `report` fails on mismatches after writing report.json.

Specs and templates:

- Unknown frontmatter keys are accepted and passed to templates; frontmatter `diffThreshold` is honored; frontmatter `url` resolves against `vt.url`; with `vt.url` set, the spec body is not navigated to.
- Templates receive `content` and `frontMatter`, and the Liquid filters `json`, `slug` and `remove_ext`. `vt/templates/default.html` and `vt/templates/index.html` override the built-in templates; frontmatter `template` picks a file under `vt/templates`.
- `vt/static/**` is served at `/` during capture and copied into `_site`.
- Wait strategies keep the precedence above; `waitEvent` uses the `window.__vtReadyState` listener.
- Section page keys are `kebab-case(title)`, unique; overview file names stay the same.

Programmatic use and processes:

- `generate()` from `@rettangoli/vt/cli` captures screenshots by default; `rtgl vt generate` passes `captureScreenshots: false`.
- Errors are thrown, so `rtgl` exits with status 1. Ctrl+C exits with status 130.

Watch mode (`rtgl fe watch` with `fe.watchVt`), shared with `@rettangoli/sites`' watch client:

- The page markers `data-rtgl-watch-entry` and `data-rtgl-watch-pending-script` and the event `rettangoli:vt-watch`.
- The messages `reload-current` (with `updateKind` `html`, `assets` or `full`) and `watch-error`.
- Spec, template and config edits send `html` updates. Edits under `vt/static` rebuild the watch site and send `assets` (CSS only), `html` (CSS together with spec, template or config edits) or `full` (any other file, or a removal). The FE entry bundle and its `.map`, dot files and editor files are not watched by VT.

## Docker Runtime Contract

Project scripts should execute their installed `rtgl/cli.js` inside a matching
Playwright image. The browser image's global CLI version is independent of a
project's dependencies. Release image builds derive versions from package
manifests and verify the resolved CLI, VT and Playwright versions. Local test
images include all workspace package sources and verify every CLI command loads.
