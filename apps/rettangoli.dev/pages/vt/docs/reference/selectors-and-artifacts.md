---
template: vt-documentation
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

All selector values are repeatable.

## Selector behavior

- Matching is union-based (OR). If any selector matches, the item is included.
- If no selectors are passed, VT uses the full set.
- `item` can be passed with or without extension.

## Selector meaning

| Selector | Matches |
| --- | --- |
| `folder` | Folder prefix under `vt/specs` |
| `group` | Section key from `vt.sections` (`title` or `items[].title`) |
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
| `.rettangoli/vt/_site/candidate` | Candidate screenshots |
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
