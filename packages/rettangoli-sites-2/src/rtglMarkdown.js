import MarkdownIt from 'markdown-it';

// Simple slug generation function
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Custom Markdown renderer configuration for Rettangoli
 * Adds rtgl-specific elements and styling
 */
export const createRtglMarkdown = () => {
  const md = MarkdownIt({
    // Additional configuration can be added here
  });

  // Header configuration
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const level = token.markup.length;
    const inlineToken = tokens[idx + 1];
    const headingText = inlineToken.content;
    const id = generateSlug(headingText);

    // Map heading levels to size values
    const sizes = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" };
    const size = sizes[level] || "md";

    return `<rtgl-text id="${id}" mt="lg" s="${size}" mb="md"> <a href="#${id}" style="display: contents;">`;
  };

  md.renderer.rules.heading_close = () => "</a></rtgl-text>\n";

  // Paragraph configuration
  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    // Check if we're inside a list item
    let isInListItem = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'list_item_open') {
        isInListItem = true;
        break;
      }
      if (tokens[i].type === 'list_item_close') {
        break;
      }
    }
    
    // Don't wrap paragraphs in list items with rtgl-text
    if (isInListItem) {
      return '';
    }
    return `<rtgl-text s="bl" mb="lg">`;
  };
  
  md.renderer.rules.paragraph_close = (tokens, idx, options, env, self) => {
    // Check if we're inside a list item
    let isInListItem = false;
    for (let i = idx - 1; i >= 0; i--) {
      if (tokens[i].type === 'list_item_open') {
        isInListItem = true;
        break;
      }
      if (tokens[i].type === 'list_item_close') {
        break;
      }
    }
    
    // Don't wrap paragraphs in list items with rtgl-text
    if (isInListItem) {
      return '\n';
    }
    return "</rtgl-text>\n";
  };

  // Table configuration
  md.renderer.rules.table_open = () => '<rtgl-view w="f">\n<table>';
  md.renderer.rules.table_close = () => "</table>\n</rtgl-view>";

  // Link configuration - add target="_blank" to all external links
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const targetIndex = token.attrIndex("target");
    const href =
      (token.attrs && token.attrs.find((attr) => attr[0] === "href")?.[1]) ||
      "";
    const isExternal = href.startsWith("http") || href.startsWith("//");

    // If this is an external link or already has target="_blank"
    if (isExternal || targetIndex >= 0) {
      if (targetIndex < 0) {
        token.attrPush(["target", "_blank"]);
      }
      token.attrPush(["rel", "noreferrer"]);

      // Find the next text token to use for the aria-label
      let nextIdx = idx + 1;
      let textContent = "";
      while (nextIdx < tokens.length && tokens[nextIdx].type !== "link_close") {
        if (tokens[nextIdx].type === "text") {
          textContent += tokens[nextIdx].content;
        }
        nextIdx++;
      }

      // Add aria-label for external links
      if (textContent.trim() && token.attrIndex("aria-label") < 0) {
        token.attrPush([
          "aria-label",
          `${textContent.trim()} (opens in new tab)`,
        ]);
      }
    }

    return self.renderToken(tokens, idx, options);
  };

  return md;
};

// Export a default instance for convenience
export default createRtglMarkdown();