---
template: vt-documentation
title: Quickstart
tags: documentation
sidebarId: vt-quickstart
---

`@rettangoli/vt` helps you generate visual baselines, compare against references, and review diffs with a report.

## 1. Install the CLI

```bash
npm install -D rtgl
```

You can also run directly with `npx rtgl ...`.

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
npx rtgl vt generate
```

Compare candidate vs reference and build report:

```bash
npx rtgl vt report
```

When changes are expected, accept them:

```bash
npx rtgl vt accept
```

## 6. Open the report

Generated report:

- `.rettangoli/vt/_site/report.html`

JSON summary:

- `.rettangoli/vt/report.json`

## Optional: run in Docker

If you prefer a containerized runtime:

```bash
docker run --rm -v "$(pwd):/workspace" -w /workspace han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc2 rtgl vt generate
docker run --rm -v "$(pwd):/workspace" -w /workspace han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc2 rtgl vt report
docker run --rm -v "$(pwd):/workspace" -w /workspace han4wluc/rtgl:playwright-v1.57.0-rtgl-v1.0.0-rc2 rtgl vt accept
```

## Next

- [CLI](../reference/cli)
- [Configuration](../reference/configuration)
- [Spec Frontmatter](../reference/frontmatter)
- [Viewport](../reference/viewport)
- [Step Actions](../reference/step-actions)
- [Selectors & Artifacts](../reference/selectors-and-artifacts)
