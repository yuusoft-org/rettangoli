---
template: blog-article
title: Reducing Friction in Site Theming
description: Class-based themes, reusable imports, and VT references create safer releases.
category: Engineering
readingTime: 7 min read
author: Luciano Wu
date: 2026-02-20
updatedAt: 2026-02-23
_bind:
  seo: seo
---
## Context

The previous theme model split variables across root and dark selectors. Moving to named classes keeps theme switching explicit and easier to reason about.

## What changed

- every shipped theme is a class
- templates only require a class swap on `body` or `html`
- VT specs verify each class across common components

## Why this matters

A consistent class-based contract is easier to document and integrate. Teams can ship new themes by adding a class block without editing template markup.

## Next steps

We continue expanding built-in templates so common layouts are available out of the box and fully covered by screenshot references.
