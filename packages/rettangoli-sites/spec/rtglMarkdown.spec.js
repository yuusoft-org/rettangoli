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
});
