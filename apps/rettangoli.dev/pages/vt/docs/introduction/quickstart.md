---
template: vt-documentation
title: Quickstart
tags: documentation
sidebarId: vt-quickstart
---

Visual testing catches UI regressions that unit tests usually miss. It is especially useful for UI libraries and frontend apps where layout, spacing, typography, and interaction states can break without JavaScript errors.

`@rettangoli/vt` helps you generate visual baselines, compare against references, and review diffs with a report.

## 1. Recommended runtime: Docker

Use the official image so every machine (local and CI) runs the same Playwright + `rtgl` environment:

```bash
docker pull han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc2
```

Set a shell alias so docs and scripts can use plain `rtgl` commands:

```bash
alias rtgl='docker run --rm -v "$(pwd):/workspace" -w /workspace han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc2 rtgl'
```

If you do not use Docker, install `rtgl` globally:

```bash
npm install -g rtgl
```

## 2. Create VT folders

Create this structure in your project:

```text
my-app/
  rettangoli.config.yaml
  vt/
    specs/
      pages/
        home.html
    reference/
```

`reference/` can start empty. It will be filled after you accept snapshots.

## 3. Add minimal VT config

In `rettangoli.config.yaml`:

```yaml
vt:
  path: ./vt
  sections:
    - title: pages
      files: pages
```

## 4. Add your first spec

Create `vt/specs/pages/home.html`:

```html
---
title: Home
---
<main data-testid="home-page">Hello VT</main>
```

## 5. Run the workflow

Generate candidate screenshots:

```bash
rtgl vt generate
```

Compare candidate vs reference and build report:

```bash
rtgl vt report
```

When changes are expected, accept them:

```bash
rtgl vt accept
```

## 6. Open the report

Generated report:

- `.rettangoli/vt/_site/report.html`

JSON summary:

- `.rettangoli/vt/report.json`

## Next

- [CLI](../reference/cli)
- [Configuration](../reference/configuration)
- [Spec Frontmatter](../reference/frontmatter)
- [Viewport](../reference/viewport)
- [Step Actions](../reference/step-actions)
- [Selectors & Artifacts](../reference/selectors-and-artifacts)
