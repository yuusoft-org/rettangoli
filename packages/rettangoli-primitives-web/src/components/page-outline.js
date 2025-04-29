import { css } from "../common";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      display: contents;
    }
  `);

  return class RettangoliPageOutline extends HTMLElement {
    items = [];

    _contentContainer;
    _selectedSlug;

    getItems = () => {
      const attributeItems = this.getAttribute("items");
      if (attributeItems) {
        const decodedItems = JSON.parse(decodeURIComponent(attributeItems));
        return decodedItems;
      }
      return this.items;
    };

    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: "closed" });
      this.shadow.adoptedStyleSheets = [styleSheet];
      render(this.shadow, this.render);
    }

    connectedCallback() {
      render(this.shadow, this.render);
    }

    disconnectedCallback() {
      this._contentContainer.removeEventListener("scroll", this.checkCurrentHeading);
      window.removeEventListener("scroll", this.checkCurrentHeading);
    }

    static get observedAttributes() {
      return ["items"];
    }

    checkCurrentHeading = () => {

      const headings = this._contentContainer.querySelectorAll("rtgl-text[id]");
      const headingElements = Array.from(headings);
      let lastHeadingId = null;

      // Find the heading that's currently in view or most recently passed
      let currentHeadingId = null;
      let closestTopPosition = -Infinity;
      // console.log('checkCurrentHeading', headingElements)
      headingElements.forEach((heading) => {
        const rect = heading.getBoundingClientRect();

        if (rect.top <= 100) {
          if (rect.top > closestTopPosition) {
            closestTopPosition = rect.top;
            currentHeadingId = heading.id;
          }
        }
      });

     
      if (currentHeadingId && currentHeadingId !== lastHeadingId) {
        console.log("checkCurrentHeading 2222222", currentHeadingId);
        lastHeadingId = currentHeadingId;
        this._selectedSlug = currentHeadingId;
        render(this.shadow, this.render);
      }
    }

    startListening = (contentContainer) => {


      this._contentContainer = contentContainer;

      const headings = this._contentContainer.querySelectorAll("rtgl-text[id]");
      const headingElements = Array.from(headings);

      this.items = headingElements.map((heading) => {
        return {
          slug: heading.id,
          title: heading.textContent
        }
      })


      // Add scroll listener to the content container
      if (contentContainer) {
        contentContainer.addEventListener("scroll", this.checkCurrentHeading, {
          passive: true,
        });
      }

      // Fallback to window scroll listener
      window.addEventListener("scroll", this.checkCurrentHeading, {
        passive: true,
      });

      // Initial check
      this.checkCurrentHeading()
    };

    render = () => {
      return html`
        <rtgl-view h="f" w="272">
          <rtgl-view w="f" g="s" mt="xl">
            ${this.getItems().map(
              (item) => { 
                console.log({
                  selectedSlug: this._selectedSlug,
                  itemSlug: item.slug
                })
                const color = `${this._selectedSlug}` === item.slug ? "fg" : "mu-fg"
                const anchorSlug = `#${item.slug}`
                return html`
                <a
                  style="display: contents; text-decoration: none; color: inherit;"
                  href=${anchorSlug}
                >
                  <rtgl-text s="sm" c=${color}>${item.title}</rtgl-text>
                </a>
              `
             } )}
          </rtgl-view>
        </rtgl-view>
      `;
    };
  };
};
