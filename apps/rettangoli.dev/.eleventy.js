
import yaml from 'js-yaml';
import MarkdownIt from 'markdown-it';
import { DateTime } from 'luxon';

const md = new MarkdownIt();
// Override the default header renderer
md.renderer.rules.heading_open = function(tokens, idx) {
  const token = tokens[idx];
  const level = token.markup.length;  // This determines the '#' count, e.g., # is 1, ## is 2, etc.

  const sizes = {
    1: 'dm',
    2: 'tl',
    3: 'tm',
    4: 'ts'
  }

  const size = sizes[level]
  return `<rtgl-text mt="l" s="${size}" mb="m">`
};

md.renderer.rules.heading_close = function(tokens, idx) {
  const token = tokens[idx];
  const level = token.markup.length;
  return '</rtgl-text>\n';  // Closing tag for custom h1
};

md.renderer.rules.paragraph_open = function(tokens, idx) {
  return `<rtgl-text c="on-su" s="bl" mb="l">`;  // Custom tag for paragraph
};

md.renderer.rules.paragraph_close = function(tokens, idx) {
  return '</rtgl-text>\n';  // Closing tag for custom paragraph
};

// Override the default link renderers
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const aIndex = tokens[idx].attrIndex('href');
  const targetIndex = tokens[idx].attrIndex('target');

  // Add a class if it does not exist
  if (targetIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']); // add new attribute
  }

  return self.renderToken(tokens, idx, options);
};

// Store the original fence rule
const defaultFenceRender = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

// Update the fence rule
md.renderer.rules.fence = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const content = token.content;
  const language = token.info.trim() ? `language-${token.info.trim()}` : '';

  return `<pre><code class="${language}">${md.utils.escapeHtml(content)}</code></pre>\n${content}\n<div style="height: 32px; width: 100%;"></div>\n`;
};




export default function (eleventyConfig) {
  eleventyConfig.setLibrary("md", md);
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });
  eleventyConfig.addWatchTarget("src/**/*.js");
  eleventyConfig.addPassthroughCopy('pages/**/*.css');
  eleventyConfig.addPassthroughCopy('pages/**/*.svg');
  eleventyConfig.addPassthroughCopy('pages/**/*.png');
  eleventyConfig.addPassthroughCopy('pages/**/*.jpg');
  eleventyConfig.addPassthroughCopy('pages/**/*.ogg');
  eleventyConfig.addPassthroughCopy('pages/**/*.mp3');
  eleventyConfig.addPassthroughCopy('pages/**/*.mp4');
  eleventyConfig.addDataExtension("yaml", (contents) => yaml.load(contents));

  return {
    dir: {
      input: "pages",
    },
  };
};
