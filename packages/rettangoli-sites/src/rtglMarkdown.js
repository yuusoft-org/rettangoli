import { codeToHtml } from 'shiki';
import { createMarkdownItAsync } from './markdownItAsync.js';

// Custom slug generation function
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (except spaces and hyphens)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, '') // Remove trailing hyphens
}

export default function configureMarkdown(_markdownit, options = {}) {
  const {
    preset = 'default',
    html = true,
    xhtmlOut = false,
    linkify = true,
    typographer = false,
    breaks = false,
    langPrefix = 'language-',
    quotes = '\u201c\u201d\u2018\u2019',
    maxNesting = 100,
    shiki = {},
    headingAnchors = true
  } = options;

  const shikiEnabled = typeof shiki.enabled === 'boolean' ? shiki.enabled : true;
  const shikiTheme = typeof shiki.theme === 'string' ? shiki.theme : 'slack-dark';

  const md = createMarkdownItAsync(preset, {
    html,
    xhtmlOut,
    linkify,
    typographer,
    breaks,
    langPrefix,
    quotes,
    maxNesting,
    ...(shikiEnabled
      ? {
          async highlight(code, lang) {
            try {
              return await codeToHtml(code, {
                lang: lang || 'text',
                theme: shikiTheme
              });
            } catch {
              return '';
            }
          }
        }
      : {}),
    warnOnSyncRender: false
  })

  if (!headingAnchors) {
    return md;
  }

  // Override heading renderer to add IDs and wrap with anchor links
  const defaultHeadingRender = md.renderer.rules.heading_open || function (tokens, idx, options, env, renderer) {
    return renderer.renderToken(tokens, idx, options)
  }

  const defaultHeadingCloseRender = md.renderer.rules.heading_close || function (tokens, idx, options, env, renderer) {
    return renderer.renderToken(tokens, idx, options)
  }

  md.renderer.rules.heading_open = function (tokens, idx, options, env, renderer) {
    const token = tokens[idx]
    const nextToken = tokens[idx + 1]
    let slug = ''

    if (nextToken && nextToken.type === 'inline') {
      const headingText = nextToken.content
      slug = slugify(headingText)
      token.attrSet('id', slug)
    }

    const headingHtml = defaultHeadingRender(tokens, idx, options, env, renderer)
    return `<a href="#${slug}" style="display: contents; text-decoration: none; color: inherit;">` + headingHtml
  }

  md.renderer.rules.heading_close = function (tokens, idx, options, env, renderer) {
    return defaultHeadingCloseRender(tokens, idx, options, env, renderer) + '</a>'
  }

  return md
}
