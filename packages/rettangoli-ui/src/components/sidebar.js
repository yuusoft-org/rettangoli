import { createWebComponentBaseElement } from "../common/BaseElement";

function flattenItems(items) {
  let result = [];

  for (const item of items) {
    // Add the parent item if it's not just a group label
    result.push({
      title: item.title,
      slug: item.slug,
      type: item.type,
    });

    // Add child items if they exist
    if (item.items && Array.isArray(item.items)) {
      for (const subItem of item.items) {
        result.push({
          title: subItem.title,
          slug: subItem.slug,
          type: subItem.type,
        });
      }
    }
  }

  return result;
}

export default ({ render, html }) => {
  return class RettangoliSidebar extends createWebComponentBaseElement({
    render,
  }) {
    items = [];

    getItems = () => {
      let items;
      const attributeItems = this.getAttribute("items");
      if (attributeItems) {
        const decodedItems = JSON.parse(decodeURIComponent(attributeItems));
        items = decodedItems;
      } else {
        items = this.items;
      }

      return flattenItems(items);
    };

    static get observedAttributes() {
      return ["items"];
    }

    render = () => {
      return html`
        <rtgl-view h="f" w="272" bwr="xs">
          <rtgl-view p="l">
            <rtgl-text s="h4" c="primary">Rettangoli test suite</rtgl-text>
          </rtgl-view>
          <rtgl-view w="f" ph="l" pb="l" g="xs">
            ${this.getItems().map((item) => {
              if (item.type === "groupLabel") {
                return html`
                  <rtgl-view mt="l" h="32" av="c" ph="m">
                    <rtgl-text s="xs" c="mu-fg">${item.title}</rtgl-text>
                  </rtgl-view>
                `;
              }

              return html`
                <a
                  style="display: contents; text-decoration: none; color: inherit;"
                  href=${item.slug}
                >
                  <rtgl-view
                    h="32"
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
              `;
            })}
          </rtgl-view>
        </rtgl-view>
      `;
    };
  };
};
