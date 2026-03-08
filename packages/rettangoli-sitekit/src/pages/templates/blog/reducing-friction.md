---
template: blog-article
title: Reducing Friction in Site Theming
description: Class-based themes, reusable imports, and VT references create safer releases.
category: Engineering
readingTime: 12 min read
author: Luciano Wu
date: February 5, 2026
_bind:
  seo: seo
---
## Context

The previous theme model split variables across root and dark selectors. Moving to named classes keeps theme switching explicit and easier to reason about.

Teams were reporting similar pain points: unclear ownership of token updates, hard-to-review diff noise in large CSS files, and uncertainty when mixing docs/blog/landing templates in the same project. The update in this cycle focused on reducing that operational friction.

## What changed

- every shipped theme is a class
- templates only require a class swap on `body` or `html`
- VT specs verify each class across common components

## Before and after

Before, styling responsibilities were spread across multiple selectors and implicit defaults. That made it difficult to answer simple questions like "which theme is active?" or "which token controls this surface?"

After moving to explicit classes, the active theme is obvious in markup and safer to change in templates:

```html
<body class="slate-dark">
  ...
</body>
```

This also makes screenshot baselines easier to organize because each theme has a stable route and expected output.

## Why this matters

A consistent class-based contract is easier to document and integrate. Teams can ship new themes by adding a class block without editing template markup.

## Example rollout process

1. Add or update one theme class in the shared stylesheet.
2. Rebuild the site and verify core pages.
3. Capture VT screenshots for docs, templates, and theme pages.
4. Review visual diffs and accept expected updates.
5. Publish template/partial updates with contract notes.

## Practical tradeoffs

No approach is free. Class-based themes increase explicitness, but teams still need discipline around token naming and contrast testing. We found two practices especially useful:

- keep token names semantic (`--background`, `--foreground`, `--primary`) rather than brand-specific
- include at least one dense content page in visual tests, not only hero-style marketing layouts

## Scroll-focused validation notes

For this article template, long content is useful to validate:

- top navbar layering while scrolling (`z-index`, fixed behavior)
- page outline synchronization over long sections
- heading anchor navigation across deep documents
- text rhythm in long-form reading contexts

### Heading depth sample

#### Section A: Theme contracts

Theme contracts should describe which tokens are required, which are optional, and which are considered compatibility-sensitive for downstream consumers.

#### Section B: Import strategy

Remote template imports speed up adoption, but local overrides should always remain available so teams can patch quickly without waiting on external package updates.

#### Section C: Regression workflow

When a visual diff appears, verify first whether the change is intentional, then classify it as token drift, layout drift, or component behavior drift. This keeps review discussions focused and reduces back-and-forth.

## Lessons learned

The main lesson is that theme infrastructure should optimize for operational clarity, not only visual flexibility. A small set of predictable rules usually beats a highly flexible system that is difficult to reason about under release pressure.

Documentation also matters as much as implementation. Teams move faster when they can read one contract page and understand exactly how to wire data, classes, and templates.

## Next steps

We continue expanding built-in templates so common layouts are available out of the box and fully covered by screenshot references.

Planned areas include richer docs navigation states, long-form article typography refinements, and additional sample pages designed specifically for scroll and sticky UI stress testing.
