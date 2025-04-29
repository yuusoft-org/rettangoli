
# Rettangoli

A set of primitives that are all the necessary to build a UI framework

The following:
* rtgl-view
* rtgl-text
* rtgl-image
* rtgl-svg
* rtgl-button

All UI components should be able to be built from the above primitives


## Development

### Install dependencies

```
bun install
```

### Generate test screens

Generate all test screens

```
bun run esbuild
bun run ./viz/cli.js generate
bunx serve ./viz/_site
```

Visit your browser at http://localhost:3000/view

It should show you all the test cases for View compoenent, and can navigate to other components on the left sidebar

### Report

Make sure the run `generate` first
```
bun run ./viz/cli.js report
```

Visit your browser at http://localhost:3000/report (make sure you're still serving the `./viz/_site` folder)

This will compare any changes between current version and the `gold` version screenshots

### Accept

```
bun run ./viz/cli.js accept
```

Updates the `gold` version screenshots with the current version.

Run this after you have made sure that the report is what you expect



