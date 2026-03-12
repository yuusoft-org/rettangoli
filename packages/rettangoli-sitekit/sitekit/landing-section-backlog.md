# Landing Section Backlog

Planning notes for additional landing-page sections and style variants.
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
"Write 3 to 5 metrics with a number, a short label, and one context line. Use concrete but fictional values such as launch speed, uptime, deployments, or revenue impact."

Checklist:
- [x] Define `landing.statsBand` schema
- [x] Add `landing-stats-band.yaml`
- [x] Add preview example with fictional metrics
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 3. How-It-Works Steps

Kind: New section
Status: Implemented

Description:
A step-by-step process section for product onboarding, setup, or delivery flow. Should work as either numbered cards or a vertical sequence.

Prompt:
"Write 3 or 4 steps that explain the product workflow from first action to final outcome. Each step needs a title, one short description, and one optional supporting note."

Checklist:
- [x] Define `landing.howItWorks` schema
- [x] Add `landing-how-it-works.yaml`
- [x] Add preview example with generic demo content
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 4. Audience Or Use-Case Cards

Kind: New section
Status: Implemented

Description:
A card grid that speaks to different buyer types or use cases. Useful when one product serves multiple teams and the page needs clear segmentation.

Prompt:
"Write 3 audience cards for distinct team types. Each card should have a label, a short pain point, and a one-line explanation of why this product fits that team."

Checklist:
- [x] Define `landing.useCases` schema
- [x] Add `landing-use-cases.yaml`
- [x] Add preview example with fictional team personas
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 5. Integration Capability Grid

Kind: New section
Status: Implemented

Description:
A section for grouped integrations or ecosystem connections. This should go beyond a logo cloud by showing what each integration category enables.

Prompt:
"Write 4 integration groups with a title, one sentence of value, and 3 to 5 example tools. Use fictional or generic tool names rather than real partner brands."

Checklist:
- [x] Define `landing.integrations` schema
- [x] Add `landing-integrations.yaml`
- [x] Add preview example with fictional tool names
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 6. Before-And-After Comparison

Kind: New section
Status: Implemented

Description:
A two-column comparison that shows the old workflow versus the improved workflow. Useful for products that replace manual, fragmented, or slow processes.

Prompt:
"Write one before-state and one after-state for the same team. Each side needs a title, a short description, and 3 short bullets that highlight the difference in workflow."

Checklist:
- [x] Define `landing.beforeAfter` schema
- [x] Add `landing-before-after.yaml`
- [x] Add preview example with generic workflow contrast
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 7. Security And Trust Assurance Block

Kind: New section
Status: Implemented

Description:
A proof section for trust, governance, and operational reliability. This is useful for B2B pages that need buyer reassurance without turning into a docs page.

Prompt:
"Write 4 trust points covering security, reliability, access control, and support. Each point should have a short heading and one sentence of explanation."

Checklist:
- [x] Define `landing.trustBlock` schema
- [x] Add `landing-trust-block.yaml`
- [x] Add preview example with generic trust statements
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 8. Case Study Mini-Spotlights

Kind: New section
Status: Implemented

Description:
A row or stack of short case-study cards for outcomes that need more detail than a testimonial but less than a full article.

Prompt:
"Write 3 fictional case-study spotlights. Each needs a company name, challenge, outcome, and one metric or result line. Keep each card compact."

Checklist:
- [x] Define `landing.caseStudies` schema
- [x] Add `landing-case-studies.yaml`
- [x] Add preview example with fictional companies and results
- [x] Add VT refs for desktop, tablet, and mobile
- [x] Document the partial in `sitekit/README.md`

## 9. Editorial Feature Mosaic

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

## 10. Roadmap Or What's-Next Timeline

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
