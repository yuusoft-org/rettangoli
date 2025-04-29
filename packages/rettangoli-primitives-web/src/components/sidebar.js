import { css } from "../common";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();

  styleSheet.replaceSync(css`
    :host {
      display: contents;
    }
  `);

  return class RettangoliSidebar extends HTMLElement {
    items = [];

    getItems = () => {
      const attributeItems = this.getAttribute("items");
      if (attributeItems) {
        const decodedItems = JSON.parse(decodeURIComponent(attributeItems));
        return decodedItems;
      }
      return this.items;
    }

    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: "closed" });
      this.shadow.adoptedStyleSheets = [styleSheet];
      render(this.shadow, this.render);
    }

    connectedCallback() {
      render(this.shadow, this.render);
    }

    static get observedAttributes() {
      return ["items"];
    }

    render = () => {
      return html`
        <rtgl-view h="f" w="272" bwr="xs">
          <rtgl-view p="l">
            <rtgl-text s="h4" c="primary">Rettangoli test suite</rtgl-text>
          </rtgl-view>
          <rtgl-view w="f" p="l" g="xs">
            ${this.getItems().map(
              (item) => html`
                <a
                  style="display: contents; text-decoration: none; color: inherit;"
                  href=${item.slug}
                >
                  <rtgl-view
                    h="36"
                    av="c"
                    ph="m"
                    w="f"
                    h-bgc="mu"
                    br="l"
                    bgc="${item.active ? "mu" : "bg"}"
                    cur="p"
                  >
                    <rtgl-text s="sm">${item.title}</rtgl-text>
                  </rtgl-view>
                </a>
              `
            )}
          </rtgl-view>
        </rtgl-view>
      `;
    };
  };
};
