
# Rettangoli

## Folder Structure

```
src/
├── primitives/     # Basic web components built from scratch, no dependencies
└── components/     # Pre-built components using @rettangoli/fe
vt/                 # Uses @rettangoli/vt visual testing library
├── reference/      # Golden screenshots for visual testing
└── specs/          # HTML test specifications
```

## Development

### Install dependencies

Use npx to install `rtgl` cli globally. You run into issues if try to use `bunx`.

```bash
npx i -g rtgl
```

Install dependencies

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
bun run vt:generate
```

Test for any change using `rettangoli-vt`

```bash
bun run vt:report
```

Accept the changes by updating the reference screenshots

```bash
bun run vt:accept
```

You can then access the generates screens

```bash
bun run serve
```
