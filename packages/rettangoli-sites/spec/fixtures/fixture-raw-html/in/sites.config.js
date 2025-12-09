export default {
  functions: {
    // Returns raw HTML that should not be escaped
    rawHtml: (content) => ({ __html: content }),

    // Simulates markdown rendering that returns raw HTML
    renderMarkdown: (text) => {
      // Simple mock - wraps in <strong> tags
      return { __html: `<strong>${text}</strong>` };
    },

    // Returns normal string (should be escaped)
    normalString: (content) => `<em>${content}</em>`
  }
}
