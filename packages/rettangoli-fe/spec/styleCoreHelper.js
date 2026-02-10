import { yamlToCss } from "../src/core/style/yamlToCss.js";

export const runStyleCoreCase = ({ scenario }) => {
  if (scenario === "empty_returns_empty_string") {
    return {
      css: yamlToCss("x", null),
    };
  }

  if (scenario === "serializes_plain_selectors") {
    const css = yamlToCss("x", {
      ":host": {
        display: "contents",
      },
      "button.primary": {
        color: "red",
      },
    });

    return {
      css,
    };
  }

  if (scenario === "serializes_media_rules") {
    const css = yamlToCss("x", {
      "@media (min-width: 768px)": {
        button: {
          height: "40px",
        },
      },
    });

    return {
      css,
    };
  }

  throw new Error(`Unknown style core scenario '${scenario}'.`);
};
