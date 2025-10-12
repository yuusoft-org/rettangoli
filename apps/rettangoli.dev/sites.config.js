import { createMarkdownItAsync } from "./markdownItAsync.js";
import { codeToHtml } from "shiki";

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

export const configureMarkdown = () => {
  const md = createMarkdownItAsync({
    html: true,
    linkify: true,
    typographer: false,
    async highlight(code, lang, attrs) {
      if (attrs.includes("codePreview")) {
        const formattedCode = await codeToHtml(code, {
          lang,
          theme: "slack-dark",
        });
        return `
        <rtgl-view w="f" bw="xs" br="md">
          <rtgl-view w="f" p="lg">
          ${code}
          </rtgl-view>
          <rtgl-view h="1" w="f" bgc="bo"></rtgl-view>
          <rtgl-view w="f" d="h">
          ${formattedCode}
          </rtgl-view>
        </rtgl-view>`
          ;
      }
      return await codeToHtml(code, { lang, theme: "slack-dark" });
    },
    warnOnSyncRender: true,
  });

  // Override heading renderer to add IDs and wrap with anchor links
  const defaultHeadingRender = md.renderer.rules.heading_open || function(tokens, idx, options, _env, renderer) {
    return renderer.renderToken(tokens, idx, options)
  }

  const defaultHeadingCloseRender = md.renderer.rules.heading_close || function(tokens, idx, options, _env, renderer) {
    return renderer.renderToken(tokens, idx, options)
  }

  md.renderer.rules.heading_open = function(tokens, idx, options, env, renderer) {
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

  md.renderer.rules.heading_close = function(tokens, idx, options, env, renderer) {
    return defaultHeadingCloseRender(tokens, idx, options, env, renderer) + '</a>'
  }

  return md;
};


export default {
  mdRender: configureMarkdown(),
  functions: {
    escapeJson: (data) => {
      return encodeURIComponent(JSON.stringify(data))
    }
  }
}
