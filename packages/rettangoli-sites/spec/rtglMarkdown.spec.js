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

  it('renders codePreview fenced blocks with preview layout when enabled', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      shiki: {
        enabled: true,
        theme: 'slack-dark'
      },
      codePreview: {
        enabled: true
      }
    });

    const html = await md.renderAsync('```html codePreview\n<rtgl-button>Click</rtgl-button>\n```');
    expect(html).toContain('<rtgl-view class="rtgl-code-preview" w="f" bw="xs" br="md">');
    expect(html).toContain('<rtgl-button>Click</rtgl-button>');
    expect(html).toContain('class="shiki');
  });

  it('hides source pane when codePreview.showSource is false', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      shiki: {
        enabled: true,
        theme: 'slack-dark'
      },
      codePreview: {
        enabled: true,
        showSource: false
      }
    });

    const html = await md.renderAsync('```html codePreview\n<rtgl-button>Click</rtgl-button>\n```');
    expect(html).toContain('<rtgl-view class="rtgl-code-preview" w="f" bw="xs" br="md">');
    expect(html).not.toContain('<rtgl-view w="f" p="lg">');
    expect(html).not.toContain('<rtgl-view h="1" w="f" bgc="bo"></rtgl-view>');
    expect(html).toContain('class="shiki');
  });

  it('uses codePreview.theme for preview blocks only', async () => {
    const md = rtglMarkdown(MarkdownIt, {
      shiki: {
        enabled: true,
        theme: 'slack-dark'
      },
      codePreview: {
        enabled: true,
        theme: 'github-dark'
      }
    });

    const previewHtml = await md.renderAsync('```html codePreview\n<rtgl-button>Click</rtgl-button>\n```');
    const normalHtml = await md.renderAsync('```html\n<rtgl-button>Click</rtgl-button>\n```');
    expect(previewHtml).toContain('github-dark');
    expect(normalHtml).toContain('slack-dark');
  });

  describe('heading anchors', () => {
    const wrapOpen = (slug) => `<a href="#${slug}" style="display: contents; text-decoration: none; color: inherit;">`;
    const plain = (headingAnchors) => rtglMarkdown(MarkdownIt, { shiki: { enabled: false }, headingAnchors });

    it('emits no closing </a> when wrap is false', async () => {
      const html = await plain({ wrap: false }).renderAsync('## Hello');
      expect(html).toBe('<h2 id="hello">Hello</h2>\n');
    });

    it('gives every heading a unique id when a heading text collides with a suffix', async () => {
      const html = await plain({ wrap: false }).renderAsync(['## Foo', '## Foo 2', '## Foo', '## Foo 2'].join('\n\n'));
      expect(html).toBe([
        '<h2 id="foo">Foo</h2>',
        '<h2 id="foo-2">Foo 2</h2>',
        '<h2 id="foo-3">Foo</h2>',
        '<h2 id="foo-2-2">Foo 2</h2>',
        ''
      ].join('\n'));
    });

    it('wraps plain headings and keeps the existing duplicate suffixes', async () => {
      const html = await plain().renderAsync(['## Intro', '## Intro'].join('\n\n'));
      expect(html).toBe(
        `${wrapOpen('intro')}<h2 id="intro">Intro</h2>\n</a>`
        + `${wrapOpen('intro-2')}<h2 id="intro-2">Intro</h2>\n</a>`
      );
    });

    it('does not wrap a heading that contains a markdown link, and keeps its id', async () => {
      const html = await plain().renderAsync('## Using the [API](https://x.com/y)');
      expect(html).toBe('<h2 id="using-the-apihttpsxcomy">Using the <a href="https://x.com/y">API</a></h2>\n');
    });

    it('does not wrap a heading that contains a linkified URL or an inline <a>', async () => {
      const html = await plain({ slugMode: 'ascii' }).renderAsync(['## See https://x.com/y', '## Read <a href="/docs">docs</a>'].join('\n\n'));
      expect(html).toBe([
        '<h2 id="see-httpsxcomy">See <a href="https://x.com/y">https://x.com/y</a></h2>',
        '<h2 id="read-a-hrefdocsdocsa">Read <a href="/docs">docs</a></h2>',
        ''
      ].join('\n'));
    });
  });

  describe('fenced code that shiki cannot highlight', () => {
    const fence = (lang, code = 'const x = 1 < 2') => `before\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\nafter`;

    it('renders an unknown language as plain text instead of dropping the block', async () => {
      const md = rtglMarkdown(MarkdownIt, { shiki: { enabled: true, theme: 'slack-dark' } });
      const html = await md.renderAsync(fence('nosuchlang'));
      expect(html).toContain('const x = 1 &#x3C; 2');
      expect(html).toBe(await md.renderAsync(fence('text')));
    });

    it('keeps the codePreview layout for an unknown language', async () => {
      const md = rtglMarkdown(MarkdownIt, { shiki: { enabled: true, theme: 'slack-dark' }, codePreview: true });
      const code = '<rtgl-text>Hi</rtgl-text>';
      const html = await md.renderAsync(fence('nosuchlang codePreview', code));
      expect(html).toContain('<rtgl-view class="rtgl-code-preview" w="f" bw="xs" br="md">');
      expect(html).toContain(code);
      expect(html).toBe(await md.renderAsync(fence('text codePreview', code)));
    });

    it('renders escaped code like markdown-it when the shiki theme is invalid', async () => {
      const md = rtglMarkdown(MarkdownIt, { shiki: { enabled: true, theme: 'not-a-real-theme' } });
      const html = await md.renderAsync(fence('js'));
      expect(html).toBe('<p>before</p>\n<pre><code class="language-js">const x = 1 &lt; 2\n</code></pre>\n<p>after</p>\n');
    });
  });
});
