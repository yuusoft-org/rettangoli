import { codeToHtml } from 'shiki';
import { createMarkdownItAsync } from './markdownItAsync.js';

function resolveHeadingAnchorOptions(input) {
  if (input === false) {
    return { enabled: false, slugMode: 'unicode', wrap: true, fallback: 'section' };
  }

  if (input === true || input == null) {
    return { enabled: true, slugMode: 'unicode', wrap: true, fallback: 'section' };
  }

  const candidate = typeof input === 'object' && !Array.isArray(input) ? input : {};
  const fallback = typeof candidate.fallback === 'string' && candidate.fallback.trim()
    ? candidate.fallback.trim()
    : 'section';

  return {
    enabled: candidate.enabled !== undefined ? !!candidate.enabled : true,
    slugMode: candidate.slugMode === 'ascii' ? 'ascii' : 'unicode',
    wrap: candidate.wrap !== undefined ? !!candidate.wrap : true,
    fallback
  };
}

function resolveCodePreviewOptions(input) {
  if (input === false || input == null) {
    return { enabled: false, showSource: true, theme: undefined };
  }

  if (input === true) {
    return { enabled: true, showSource: true, theme: undefined };
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    const theme = typeof input.theme === 'string' && input.theme.trim()
      ? input.theme.trim()
      : undefined;
    return {
      enabled: input.enabled !== undefined ? !!input.enabled : true,
      showSource: input.showSource !== undefined ? !!input.showSource : true,
      theme
    };
  }

  return { enabled: false, showSource: true, theme: undefined };
}

function hasCodePreviewAttribute(attrs) {
  if (typeof attrs !== 'string') {
    return false;
  }
  return attrs
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .includes('codePreview');
}

function renderCodePreviewLayout(code, highlightedCode, showSource = true) {
  if (!showSource) {
    return `
        <rtgl-view class="rtgl-code-preview" w="f" bw="xs" br="md">
          <rtgl-view w="f" d="h">
          ${highlightedCode}
          </rtgl-view>
        </rtgl-view>`;
  }

  return `
        <rtgl-view class="rtgl-code-preview" w="f" bw="xs" br="md">
          <rtgl-view w="f" p="lg">
          ${code}
          </rtgl-view>
          <rtgl-view h="1" w="f" bgc="bo"></rtgl-view>
          <rtgl-view w="f" d="h">
          ${highlightedCode}
          </rtgl-view>
        </rtgl-view>`;
}

function slugify(text, { slugMode = 'unicode', fallback = 'section' } = {}) {
  const normalized = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(
      slugMode === 'ascii' ? /[^a-z0-9\s-]/g : /[^\p{Letter}\p{Number}\s-]/gu,
      ''
    )
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, '') // Remove trailing hyphens

  return normalized || fallback;
}

export function createRtglMarkdown(_markdownit, options = {}) {
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
    headingAnchors = true,
    codePreview = false
  } = options;
  const headingAnchorOptions = resolveHeadingAnchorOptions(headingAnchors);
  const codePreviewOptions = resolveCodePreviewOptions(codePreview);

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
          async highlight(code, lang, attrs) {
            try {
              const isCodePreview = codePreviewOptions.enabled && hasCodePreviewAttribute(attrs);
              const highlightTheme = isCodePreview
                ? (codePreviewOptions.theme || shikiTheme)
                : shikiTheme;
              const highlightedCode = await codeToHtml(code, {
                lang: lang || 'text',
                theme: highlightTheme
              });
              if (isCodePreview) {
                return renderCodePreviewLayout(code, highlightedCode, codePreviewOptions.showSource);
              }
              return highlightedCode;
            } catch {
              return '';
            }
          }
        }
      : {}),
    warnOnSyncRender: false
  })

  if (!headingAnchorOptions.enabled) {
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
    env = env || {};
    const token = tokens[idx]
    const nextToken = tokens[idx + 1]
    let slug = headingAnchorOptions.fallback

    if (nextToken && nextToken.type === 'inline') {
      const headingText = nextToken.content
      const baseSlug = slugify(headingText, headingAnchorOptions)
      const headingCounts = env.__rtglHeadingSlugCounts || (env.__rtglHeadingSlugCounts = new Map())
      const nextCount = (headingCounts.get(baseSlug) || 0) + 1
      headingCounts.set(baseSlug, nextCount)
      slug = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`
    }

    token.attrSet('id', slug)
    const headingHtml = defaultHeadingRender(tokens, idx, options, env, renderer)
    if (!headingAnchorOptions.wrap) {
      return headingHtml
    }
    return `<a href="#${slug}" style="display: contents; text-decoration: none; color: inherit;">` + headingHtml
  }

  md.renderer.rules.heading_close = function (tokens, idx, options, env, renderer) {
    return defaultHeadingCloseRender(tokens, idx, options, env, renderer) + '</a>'
  }

  return md
}

export default createRtglMarkdown;
