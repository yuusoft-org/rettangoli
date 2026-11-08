---
template: docs
_bind:
  docs: vtDocs
title: Selectors & Artifacts
tags: documentation
sidebarId: vt-selectors-and-artifacts
---

Use selectors to run or compare only part of your VT suite.

## Selector options

Available in both `screenshot` and `report`:

- `--folder <path>`
- `--group <section-key>`
- `--item <spec-path>`

All selector values are repeatable. `generate` accepts them too, but it always builds every page.

## Selector behavior

- Matching is union-based (OR). If any selector matches, the item is included.
- If no selectors are passed, VT uses the full set.
- `item` can be passed with or without extension.
- A screenshot maps to its spec by name: `pages/btn--mobile-01.webp` belongs to `pages/btn`, unless a spec named `pages/btn--mobile` exists.
- A `--folder` or `--item` that matches nothing prints a `[vt] Warning:` line. The run still succeeds.

## Selector meaning

| Selector | Matches |
| --- | --- |
| `folder` | Folder prefix under `vt/specs` |
| `group` | Section key from `vt.sections`: the `title` (or `items[].title`) in kebab-case, for example `Components Basic` becomes `components-basic` |
| `item` | Specific spec path relative to `vt/specs` |

Examples:

```bash
rtgl vt screenshot --folder components/forms
rtgl vt screenshot --group pages
rtgl vt screenshot --item components/forms/login
rtgl vt report --group forms --item components/forms/login.html
```

## Output artifacts

| Path | Purpose |
| --- | --- |
| `.rettangoli/vt/_site/candidate` | Candidate pages and screenshots |
| `.rettangoli/vt/_site/candidate/.vt-capture.json` | Capture manifest: whether screenshots were captured and the selector scope. `accept` reads it |
| `vt/reference` | Source-of-truth reference screenshots |
| `.rettangoli/vt/_site/reference` | Reference copy used by report UI |
| `.rettangoli/vt/_site/diff` | Diff images for mismatches |
| `.rettangoli/vt/_site/report.html` | HTML report |
| `.rettangoli/vt/report.json` | Machine-readable mismatch report |
| `.rettangoli/vt/metrics.json` | Capture timing metrics |

## Screenshot naming

Default naming:

- `<base>-01.webp`
- `<base>-02.webp`

When viewport IDs are used:

- `<base>--<viewportId>-01.webp`
- `<base>--<viewportId>-02.webp`

The first screenshot is taken before `steps` unless the spec sets `skipInitialScreenshot`. Two specs that produce the same screenshot name (`btn--mobile.html` next to `btn.html` with a `mobile` viewport) fail the capture, naming both.

## Spec files

- Every file under `vt/specs` is a spec, except names that start with `.`, end with `~`, or look like `#name#`, and everything under a directory with such a name.
- A spec generates `candidate/<path>.html`. Two specs that generate the same page (`a.html` and `a.yaml`) fail `generate`, naming both.
- Spec names may contain spaces, non-ASCII characters, `%`, `#` and `?`.
