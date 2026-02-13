# basic-app (example)

Example application code structure for the proposed rettangoli backend framework.

## Purpose

This folder is for design review, not production use.

What it demonstrates:
- `setup.js` as composition root
- DI boundary with DAO/services in `deps/`
- Koa-style middleware chain
- module registration contract (`methods` + `contracts`)
- per-method schema files for params/result

What is intentionally placeholder:
- framework import (`@rettangoli/be`) because runtime package is not implemented yet

## Structure

```txt
src/
  index.js
  setup.js
  deps/
  middleware/
  modules/
```

## Suggested review checklist

1. Is the `deps` boundary clear enough for DAO/services?
2. Is `ctx` shape in middleware/handlers sufficient?
3. Are module contracts ergonomic for scaling domains?
4. Are schema files expressive enough for request/result contracts?
