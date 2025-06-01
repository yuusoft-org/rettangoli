
# Rettangoli

A set of primitives that are all the necessary to build a UI framework

The following:
* rtgl-view
* rtgl-text
* rtgl-image
* rtgl-svg
* rtgl-button
* rtgl-input
* rtgl-textarea

All UI components should be able to be built from the above primitives


## Development

### Install dependencies



```bash
bun install
```




### Generate test screens

Bundles the code to be used for `rettangoli-vt`

```bash
bun run build:dev
```

Uses `rettangoli-vt` to generates test screens 

```bash
bun run ../rettangoli-cli/cli.js vt generate --skip-screenshots
```

You can then access the generates screens

```bash
bunx serve ./viz/_site
```
