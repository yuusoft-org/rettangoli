import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';

// Free text in sitekit partials (seo meta content, FAQ label/content, image alt) must survive
// double quotes, and a missing or null value must render an empty attribute. Builds a throwaway site with the real partials through the sites CLI.
// RTGL_CLI swaps in another CLI, to check the partials against an older published engine.
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = process.env.RTGL_CLI ?? resolve(packageDirectory, '../rettangoli-cli/cli.js');

const quoted = (id) => `${id} The "Best" VN engine & <more> 'too'`;
const plain = (id) => `${id} plain text`;
// JSON drops undefined fields, so `missing` leaves the free text out of the page data entirely.
const variants = { quoted, plain, missing: () => undefined, null: () => null };

const image = (text, id) => ({ src: `/${id}.png`, alt: text(id) });
const card = (text, id) => ({ title: id, imageSrc: `/${id}.png`, imageAlt: text(id) });

// Each case renders one partial; `values` lists, in document order, the free-text values that
// must come out of `tag` attributes named in `attrs`.
const cases = [
  {
    partial: 'seo',
    tag: 'meta',
    attrs: ['content'],
    data: (text) => ({
      title: 'Home',
      seo: { title: text('seo-title'), description: text('seo-desc'), ogSiteName: text('seo-site'), ogType: text('seo-type') },
    }),
    values: (text) => [text('seo-desc'), text('seo-title'), text('seo-desc'), text('seo-site'), text('seo-type')],
  },
  {
    partial: 'landing-faq',
    tag: 'rtgl-accordion-item',
    attrs: ['label', 'content'],
    data: (text) => ({ sectionTitle: 'FAQ', items: [{ question: text('faq-q'), answer: text('faq-a') }] }),
    values: (text) => [text('faq-q'), text('faq-a')],
  },
  {
    partial: 'landing-icon-features',
    data: (text) => ({ items: [{ title: 'One', image: image(text, 'alt-icon') }] }),
    values: (text) => [text('alt-icon')],
  },
  {
    partial: 'landing-testimonials-grid',
    data: (text) => ({ items: [{ quote: 'Q', image: image(text, 'alt-testimonial') }] }),
    values: (text) => [text('alt-testimonial')],
  },
  {
    partial: 'collection-section-card-grid',
    data: (text) => ({ items: [card(text, 'alt-card')] }),
    values: (text) => [text('alt-card')],
  },
  {
    partial: 'collection-section-split-columns',
    data: (text) => ({ items: [card(text, 'alt-split')] }),
    values: (text) => [text('alt-split')],
  },
  {
    partial: 'collection-section-featured-list',
    data: (text) => ({ lead: card(text, 'alt-featured-lead'), items: [card(text, 'alt-featured-item')] }),
    values: (text) => [text('alt-featured-lead'), text('alt-featured-item')],
  },
  {
    partial: 'collection-section-grouped-list',
    data: (text) => ({ groups: [{ title: 'G', items: [card(text, 'alt-group-first'), card(text, 'alt-group-rest')] }] }),
    values: (text) => [text('alt-group-first'), text('alt-group-rest')],
  },
  {
    partial: 'collection-section-compact-list',
    data: (text) => ({ items: [card(text, 'alt-compact')] }),
    values: (text) => [text('alt-compact')],
  },
  {
    partial: 'landing-hero',
    data: (text) => ({ title: 'Hero', image: image(text, 'alt-hero') }),
    values: (text) => [text('alt-hero')],
  },
  {
    partial: 'landing-full-image',
    data: (text) => ({ image: image(text, 'alt-full') }),
    values: (text) => [text('alt-full')],
  },
  {
    partial: 'landing-feature-mosaic',
    data: (text) => ({ lead: { title: 'Lead', image: image(text, 'alt-mosaic-lead') }, items: [{ title: 'Item', image: image(text, 'alt-mosaic-item') }] }),
    values: (text) => [text('alt-mosaic-lead'), text('alt-mosaic-item')],
  },
  {
    partial: 'landing-features-section',
    data: (text) => ({ items: [
      { title: 'Right', imageRight: true, image: image(text, 'alt-feature-right') },
      { title: 'Left', image: image(text, 'alt-feature-left') },
    ] }),
    values: (text) => [text('alt-feature-right'), text('alt-feature-left')],
  },
  {
    partial: 'landing-logo-cloud',
    data: (text) => ({ items: [
      { href: '/a', target: '_blank', ...image(text, 'alt-logo-new-tab') },
      { href: '/b', ...image(text, 'alt-logo-link') },
      image(text, 'alt-logo-plain'),
    ] }),
    values: (text) => [text('alt-logo-new-tab'), text('alt-logo-link'), text('alt-logo-plain')],
  },
].map((entry) => ({ tag: 'rtgl-image', attrs: ['alt'], ...entry }));

const entities = { '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
const decode = (value) => value.replace(/&(?:quot|#39|lt|gt|amp);/g, (entity) => entities[entity]);

// Every <tag ...> in the page, as a list of [name, decoded value] pairs.
function readTags(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(([, source]) =>
    [...source.matchAll(/([^\s=/>]+)(?:="([^"]*)")?/g)].map(([, name, value]) => [name, value === undefined ? true : decode(value)]),
  );
}

function pageSource(data, partial) {
  const params = Object.keys(data).map((key) => `      ${key}: \${${key}}`).join('\n');
  // JSON is valid YAML, so the frontmatter keeps every string exactly.
  return `---\n${JSON.stringify(data)}\n---\n- div:\n    - $partial: ${partial}\n      page: \${page}\n${params}\n`;
}

let siteDirectory;
const rendered = {};

before(() => {
  siteDirectory = mkdtempSync(join(tmpdir(), 'sitekit-partials-'));
  cpSync(join(packageDirectory, 'sitekit/partials'), join(siteDirectory, 'partials'), { recursive: true });
  mkdirSync(join(siteDirectory, 'data'));
  writeFileSync(join(siteDirectory, 'data/site.yaml'), 'baseUrl: https://example.com\n');
  for (const [variant, text] of Object.entries(variants)) {
    mkdirSync(join(siteDirectory, 'pages', variant), { recursive: true });
    for (const { partial, data } of cases) {
      writeFileSync(join(siteDirectory, 'pages', variant, `${partial}.yaml`), pageSource(data(text), partial));
    }
  }

  const result = spawnSync(process.execPath, [cli, 'sites', 'build', '--quiet'], { cwd: siteDirectory, encoding: 'utf8' });
  assert.equal(result.status, 0, `sites build failed:\n${result.stdout}\n${result.stderr}`);
  for (const variant of Object.keys(variants)) {
    rendered[variant] = Object.fromEntries(cases.map(({ partial }) => [
      partial,
      readFileSync(join(siteDirectory, '_site', variant, partial, 'index.html'), 'utf8'),
    ]));
  }
});

after(() => {
  if (siteDirectory) rmSync(siteDirectory, { recursive: true, force: true });
});

test('the matrix covers seo, landing-faq and all 18 image alt attributes', () => {
  assert.equal(cases.length, 14);
  const altValues = cases.filter(({ attrs }) => attrs.includes('alt')).flatMap(({ values }) => values(plain));
  assert.equal(altValues.length, 18);
});

for (const { partial, tag, attrs, values } of cases) {
  const pick = (variant) => readTags(rendered[variant][partial], tag);
  const isFreeText = ([name, value]) => attrs.includes(name) && typeof value === 'string' && /^(seo|faq|alt)-/.test(value);

  test(`${partial}: free text with double quotes survives in ${tag} ${attrs.join('/')}`, () => {
    const freeText = (tags) => tags.flatMap((pairs) => pairs.filter(isFreeText).map(([, value]) => value));

    for (const variant of Object.keys(variants)) {
      assert.doesNotMatch(rendered[variant][partial], /\$\{/, `${variant}: an expression was left unrendered`);
    }
    assert.deepEqual(freeText(pick('plain')), values(plain));
    assert.deepEqual(freeText(pick('quoted')), values(quoted));
    // Apart from the free text, the tags are the same as with quote-free text: same attributes, in
    // the same order, with the same values, so no attribute ends early or leaks out.
    const shape = (tags) => tags.map((pairs) => pairs.map((pair) => (isFreeText(pair) ? [pair[0], '<free text>'] : pair)));
    assert.deepEqual(shape(pick('quoted')), shape(pick('plain')));
  });

  test(`${partial}: a missing or null value renders an empty ${tag} ${attrs.join('/')}`, () => {
    // The plain tags with every free-text attribute emptied: each one still there, as ''.
    const expected = pick('plain').map((pairs) => pairs.map((pair) => (isFreeText(pair) ? [pair[0], ''] : pair)));
    assert.equal(expected.flat().filter(([name, value]) => attrs.includes(name) && value === '').length, values(plain).length);
    for (const variant of ['missing', 'null']) {
      assert.doesNotMatch(rendered[variant][partial], /="(?:undefined|null)"/, `${variant}: a value was rendered as text`);
      assert.deepEqual(pick(variant), expected, variant);
    }
  });
}
