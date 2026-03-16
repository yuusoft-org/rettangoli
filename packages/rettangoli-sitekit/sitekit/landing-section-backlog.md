# Landing Section Backlog

Planning notes for the extra landing-page section types that remain published in sitekit.
This list intentionally excludes carousel ideas.

## 1. Testimonial Quote Grid

Kind: New section
Status: Implemented

Description:
A multi-card quote grid for customer proof without using a slider. Best when the page needs short, scannable endorsements from different buyer types.

Prompt:
"Write 4 fictional customer quotes from different roles. Keep each quote under 22 words. Give each quote an author name, role, company, and one outcome sentence."

Checklist:
- [x] Define `landing.testimonialsGrid` schema
- [x] Add `landing-testimonials-grid.yaml`
- [x] Add preview example with fictional names and companies
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 2. KPI Stats Band

Kind: New section
Status: Implemented

Description:
A short metrics strip for numbers that establish traction fast. Good near the top of the page after hero or logo cloud.

Prompt:
"Write 3 to 5 metrics with a number and a short label. Use concrete but fictional values such as launch speed, uptime, deployments, or revenue impact."

Checklist:
- [x] Define `landing.statsBand` schema
- [x] Add `landing-stats-band.yaml`
- [x] Add preview example with fictional metrics
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 3. Editorial Feature Mosaic

Kind: Style variant
Status: Implemented

Description:
A more visual variant of the current icon-features or feature-section patterns, using asymmetric card sizing or a staggered image-and-copy mosaic. Best for higher-impact marketing pages.

Prompt:
"Write 4 feature blocks with one hero block and 3 supporting blocks. Each block should have a short title, one sentence of value, and optional visual direction."

Checklist:
- [x] Define `landing.featureMosaic` schema
- [x] Add `landing-feature-mosaic.yaml`
- [x] Add preview example with asymmetrical layout
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 4. Roadmap Or What's-Next Timeline

Kind: New section
Status: Implemented

Description:
A forward-looking section for product direction, launch phases, or rollout milestones. Good near the bottom of the page when the page needs momentum and roadmap confidence.

Prompt:
"Write 3 roadmap milestones with a timeframe label, a short title, and one sentence describing what ships or improves in that phase."

Checklist:
- [x] Define `landing.roadmap` schema
- [x] Add `landing-roadmap.yaml`
- [x] Add preview example with fictional milestones
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`
