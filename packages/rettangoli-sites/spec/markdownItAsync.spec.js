import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { createMarkdownItAsync } from '../src/markdownItAsync.js';

const source = [
  'Intro',
  '',
  '```js',
  "const quote = 'it\\'s' + \"<b>\" && a & b;",
  '```',
  '',
  '```',
  "plain 'text' <tag>",
  '```',
  '',
  '```a"b extra',
  "x'y",
  '```',
  ''
].join('\n');

describe('MarkdownItAsync', () => {
  it('renders the escaped markdown-it code block when an async highlight resolves empty', async () => {
    const md = createMarkdownItAsync({ highlight: async () => '' });
    expect(await md.renderAsync(source)).toBe(new MarkdownIt().render(source));
  });

  it('uses the configured langPrefix in the fallback', async () => {
    const md = createMarkdownItAsync({ langPrefix: 'lang-', highlight: async () => undefined });
    expect(await md.renderAsync(source)).toBe(new MarkdownIt({ langPrefix: 'lang-' }).render(source));
  });

  it('uses the async highlight result when there is one', async () => {
    const md = createMarkdownItAsync({ highlight: async (code, lang) => `<pre class="hl-${lang}">${code.length}</pre>` });
    expect(await md.renderAsync('```js\nabc\n```')).toBe('<pre class="hl-js">4</pre>\n');
  });
});
