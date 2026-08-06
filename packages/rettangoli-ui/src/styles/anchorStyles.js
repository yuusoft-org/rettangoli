import { css } from "../common.js";

export default css`
  a, a:link, a:visited, a:hover, a:active {
    color: inherit;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font: inherit;
  }

  a:focus-visible {
    outline: var(--focus-ring-outline, none);
    box-shadow: inset 0 0 0 2px var(--ring);
  }
`;
