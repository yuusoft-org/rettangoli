# Compatibility And Deprecation Calendar

## Compatibility Window

- CLI contract v1: current minor + next minor
- IR contract v1: current minor + next minor (read compatibility)
- Language levels: current level set supported for at least one minor release after deprecation notice

## Deprecation Cadence

- T0: deprecation notice lands in docs/changelog
- T0 + 1 minor: deprecated behavior remains supported with warnings
- T0 + 2 minor: behavior may be removed

## Release Review Checklist

Every release must include:

- semantic compatibility impact statement
- migration notes for changed behavior
- confirmation that reliability gate and governance contracts are green
