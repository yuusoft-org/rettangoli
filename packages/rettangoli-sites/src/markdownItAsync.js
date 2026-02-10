/**
 * Adapted from https://github.com/antfu/markdown-it-async
 */

import MarkdownIt from 'markdown-it';

const placeholder = (id, code) => `<pre><!--::markdown-it-async::${id}::--><code>${code}</code></pre>`;
const placeholderRe = /<pre><!--::markdown-it-async::(\w+)::--><code>[\s\S]*?<\/code><\/pre>/g;
const wrappedSet = new WeakSet();

function randStr() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapHighlight(highlight, map) {
  if (!highlight) {
    return undefined;
  }

  if (wrappedSet.has(highlight)) {
    return highlight;
  }

  const wrapped = (str, lang, attrs) => {
    const result = highlight(str, lang, attrs);
    if (typeof result === 'string') {
      return result;
    }

    const id = randStr();
    map.set(id, [result, str, lang, attrs]);
    const escapedCode = escapeHtml(str.endsWith('\n') ? str.slice(0, -1) : str);
    return placeholder(id, escapedCode);
  };

  wrappedSet.add(wrapped);
  return wrapped;
}

async function replaceAsync(string, searchValue, replacer) {
  const values = [];
  String.prototype.replace.call(string, searchValue, (...args) => {
    values.push(replacer(...args));
    return '';
  });

  const resolvedValues = await Promise.all(values);
  return String.prototype.replace.call(string, searchValue, () => resolvedValues.shift() || '');
}

export class MarkdownItAsync extends MarkdownIt {
  constructor(...args) {
    const options = args.length === 2 ? args[1] : args[0];
    const map = new Map();

    if (options && 'highlight' in options) {
      options.highlight = wrapHighlight(options.highlight, map);
    }

    super(...args);
    this.placeholderMap = map;
    this.disableWarn = false;
  }

  render(src, env) {
    if (this.options.warnOnSyncRender && !this.disableWarn) {
      console.warn('[markdown-it-async] Please use `md.renderAsync` instead of `md.render`');
    }
    return super.render(src, env);
  }

  async renderAsync(src, env) {
    this.options.highlight = wrapHighlight(this.options.highlight, this.placeholderMap);
    this.disableWarn = true;
    const result = this.render(src, env);
    this.disableWarn = false;

    return replaceAsync(result, placeholderRe, async (_match, id) => {
      const item = this.placeholderMap.get(id);
      if (!item) {
        throw new Error(`Unknown highlight placeholder id: ${id}`);
      }
      const [promise] = item;
      const highlighted = (await promise) || '';
      this.placeholderMap.delete(id);
      return highlighted;
    });
  }
}

export function createMarkdownItAsync(...args) {
  return new MarkdownItAsync(...args);
}

export default createMarkdownItAsync;
