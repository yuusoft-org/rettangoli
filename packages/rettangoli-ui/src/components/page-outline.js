import { createWebComponentBaseElement } from "../common/BaseElement";

export default ({ render, html }) => {
  return class RettangoliPageOutline extends createWebComponentBaseElement({ render }) {
    items = [];

    _contentContainer;
    _selectedSlug;


    onUnmount = () => {
      this._contentContainer.removeEventListener("scroll", this.checkCurrentHeading);
      window.removeEventListener("scroll", this.checkCurrentHeading);
    }

    checkCurrentHeading = () => {

      const headings = this._contentContainer.querySelectorAll("rtgl-text[id]");
      const headingElements = Array.from(headings);
      let lastHeadingId = null;

      // Find the heading that's currently in view or most recently passed
      let currentHeadingId = null;
      let closestTopPosition = -Infinity;
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
        lastHeadingId = currentHeadingId;
        this._selectedSlug = currentHeadingId;
        this.reRender();
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
          <rtgl-view w="f" g="sm" mt="xl">
            ${this.items.map(
              (item) => { 
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
