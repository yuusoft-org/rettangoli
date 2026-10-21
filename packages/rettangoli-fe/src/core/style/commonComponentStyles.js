/**
 * Styles installed in every Rettangoli component shadow root.
 *
 * Kept in core so the web binding and the server renderer emit the exact same
 * rules. The server places them in a declarative-shadow-root <style>; the web
 * binding installs them as a constructable stylesheet.
 *
 * `:host` is `display: contents`, as the web binding also sets on the host
 * element itself, so server-rendered markup lays out the same before any
 * script has run (an undefined element is otherwise `display: inline`).
 */
export const COMMON_COMPONENT_STYLE_TEXT = `
  :host {
    display: contents;
  }
  a, a:link, a:visited, a:hover, a:active {
    display: contents;
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
    cursor: pointer;
  }
`;
