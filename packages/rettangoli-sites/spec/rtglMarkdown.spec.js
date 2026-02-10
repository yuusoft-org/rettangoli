import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import rtglMarkdown from '../src/rtglMarkdown.js';

describe('rtglMarkdown', () => {
  it('renders fenced code with shiki when enabled', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      shiki: {
        enabled: true,
        theme: 'slack-dark'
      }
    });

    const html = await md.renderAsync('```js\nconst x = 1\n```');
    expect(html).toContain('class="shiki');
  });

  it('renders standard markdown-it code block when shiki is disabled', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      shiki: {
        enabled: false
      }
    });

    const html = await md.renderAsync('```js\nconst x = 1\n```');
    expect(html).toContain('<pre><code class="language-js">');
  });

  it('creates unique heading anchors for duplicate headings', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      shiki: {
        enabled: false
      }
    });

    const html = await md.renderAsync(['## Intro', '## Intro'].join('\n\n'));
    expect(html).toContain('id="intro"');
    expect(html).toContain('href="#intro"');
    expect(html).toContain('id="intro-2"');
    expect(html).toContain('href="#intro-2"');
  });

  it('uses stable fallback anchors for symbol-only headings', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      shiki: {
        enabled: false
      }
    });

    const html = await md.renderAsync(['### !!!', '### !!!'].join('\n\n'));
    expect(html).toContain('id="section"');
    expect(html).toContain('id="section-2"');
  });

  it('supports configurable heading anchor options', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      headingAnchors: {
        enabled: true,
        slugMode: 'ascii',
        wrap: false,
        fallback: 'part'
      }
    });

    const html = await md.renderAsync(['## Café', '## !!!', '## !!!'].join('\n\n'));
    expect(html).toContain('id="cafe"');
    expect(html).not.toContain('href="#cafe"');
    expect(html).toContain('id="part"');
    expect(html).toContain('id="part-2"');
  });
});
