# Rettangoli Sitekit

Use this package for curated reusable site assets only.

Source of truth order:
1. `README.md`
2. `sitekit/README.md`
3. `rettangoli.config.yaml`
4. `src/README.md`
5. `vt/README.md`

Rules:
- Keep reusable themes, templates, partials, schemas, and small runtime helpers under `sitekit/`.
- Keep `src/` as the local preview site that consumes the published assets.
- Keep `vt/` as the verification surface for every published asset.
- Do not add generator/runtime source code here; that belongs in `packages/rettangoli-sites`.
- Prefer editing `sitekit/*` and letting the preview site and VT consume those exact files.
- If a template needs helper assets, publish them under `sitekit/public/` and document the requirement.
