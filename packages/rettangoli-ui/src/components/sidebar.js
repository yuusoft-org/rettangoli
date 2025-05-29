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

    title = {
      label: undefined,
      labelHref: undefined,
      href: undefined,
      image: {
        src: undefined,
        alt: undefined,
        width: undefined,
        height: undefined,
        href: undefined,
      },
    };

    onMount = () => {
      const titleAttribute = this.getAttribute("title");
      if (titleAttribute) {
        console.log('titleAttribute', titleAttribute)
        this.title = JSON.parse(decodeURIComponent(titleAttribute));
        this.reRender();
      }
    }

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
          <rtgl-view p="lg">
            <a
              style="text-decoration: none; display: contents; color: inherit;"
              href=${this.title.href}
            >
              <rtgl-view d="h" av="c" g="lg">
                ${this.title?.image?.src
                  ? html`<rtgl-image
                      w=${this.title?.image?.width}
                      h=${this.title?.image?.height}
                      src=${this.title?.image?.src}
                      alt=${this.title?.image?.alt || "Navbar"}
                    />`
                  : ""}
                ${this.title?.label ? html`<rtgl-text s="lg">${this.title?.label}</rtgl-text>` : ""}
              </rtgl-view>
            </a>
          </rtgl-view>
          <rtgl-view w="f" ph="lg" pb="lg" g="xs">
            ${this.getItems().map((item, index) => {
              const isFirst = index === 0;
              if (item.type === "groupLabel") {
                const marginTop = isFirst ? undefined : "md";
                return html`
                  <rtgl-view mt=${marginTop} h="32" av="c" ph="md">
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
                    ph="md"
                    w="f"
                    h-bgc="mu"
                    br="lg"
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
