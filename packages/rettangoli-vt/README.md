
# Rettangoli Visual Testing

A visual testing framework for UI components using Playwright and screenshot comparison. Perfect for regression testing and ensuring UI consistency across changes.

**In production**, this package is typically used through the `rtgl` CLI tool. For development and testing of this package itself, you should call the local CLI directly.

## Features

- **Screenshot Generation** - Automatically generate screenshots from HTML specifications
- **Visual Comparison** - Compare screenshots to detect visual changes
- **Test Reports** - Generate detailed reports with diff highlights
- **Playwright Integration** - Uses Playwright for reliable cross-browser testing
- **Worker Pool Capture Engine** - Dynamic Playwright task scheduling with adaptive parallelism
- **Fair Retry Scheduling** - Prioritizes expensive pages first while preventing retry starvation
- **Template System** - Liquid templates for flexible HTML generation
- **Configuration** - YAML-based configuration for easy customization

## Development

### Prerequisites

- Node.js 18+ or Bun
- Playwright browsers (automatically installed)

### Setup

1. **Install dependencies**:
```bash
bun install
```

2. **Install Playwright browsers** (if not already installed):
```bash
npx playwright install
```

### Project Structure

```
src/
├── cli/
│   ├── generate.js    # Generate screenshots from specifications
│   ├── report.js      # Generate visual comparison reports
│   ├── accept.js      # Accept screenshot changes as new reference
│   ├── templates/     # HTML templates for reports
│   └── static/        # Static assets (CSS, etc.)
├── common.js          # Shared utilities and functions
└── index.js           # Main export (empty - CLI focused)
```

### Core Functionality

The visual testing framework provides three main commands:

#### 1. Generate (`vt generate`)
- Reads HTML specifications from `vt/specs/` directory
- Generates screenshots using Playwright
- Saves candidate screenshots for comparison
- Creates a static site for viewing results

#### 2. Report (`vt report`)
- Compares candidate screenshots with reference screenshots
- Generates visual diff reports highlighting changes
- Creates an HTML report with before/after comparisons
- Uses `pixelmatch` for image comparison

#### 3. Accept (`vt accept`)
- Accepts candidate screenshots as new reference images
- Updates the golden/reference screenshot directory
- Used when visual changes are intentional

### Configuration

The framework reads configuration from `rettangoli.config.yaml`:

```yaml
vt:
  # Required: drives the index/overview structure
  sections:
    - title: "Components"
      files: "components"
  port: 3001
  skipScreenshots: false
```

`vt.capture` is now internal and should not be configured by users.

Section page keys (`title` for flat sections and grouped `items[].title`) must use only letters, numbers, `-`, `_` (no spaces).

### Specification

The detailed contract is documented in:

- `docs/spec.md`

### Testing Your Changes

**Note**: This package doesn't include example files in its directory. For testing during development, use examples from other packages (like `rettangoli-ui`) and call the CLI directly:

```bash
# Call the local CLI directly for development
node ../rettangoli-cli/cli.js vt generate
node ../rettangoli-cli/cli.js vt report
node ../rettangoli-cli/cli.js vt accept
```

**Production usage** (when rtgl is installed globally):
```bash
rtgl vt generate
rtgl vt report
rtgl vt accept
```

Optional real-browser smoke test:

```bash
VT_E2E=1 bun test spec/e2e-smoke.spec.js
```

Capture benchmark fixture:

```bash
bun run bench:capture
```

Useful perf flags through `rtgl vt generate`:

- `--skip-screenshots`
- `--headed`
