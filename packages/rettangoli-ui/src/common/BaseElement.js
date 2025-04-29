/**
 * Subscribes to all observables and returns a functionthat will unsubscribe
 * from all observables when called
 * @param {*} observables
 * @returns
 */
const subscribeAll = (observables) => {
  // Subscribe to all observables and store the subscription objects
  const subscriptions = observables.map((observable) => observable.subscribe());

  // Return a function that will unsubscribe from all observables when called
  return () => {
    for (const subscription of subscriptions) {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    }
  };
};

/**
 * Creates a base web component element to be used in environments
 * where the output is strings such as server side rendering environments
 * @param {Object} param
 * @param {Function} param.render - The render function to be used in the element. compliant with uhtml.render
 * @returns
 */
export const createSsrBaseElement = ({ render }) => {

  class CSSStyleSheet {
    _css = "";

    get css() {
      return this._css;
    }

    replaceSync(css) {
      this._css = css;
    }
  }
  class SsrRenderTarget {
    innerHTML = "";
    adoptedStyleSheets = [];
    write(html) {
      this.innerHTML = html;
    }
  }
  class BaseBaseSsrElement {
    renderTarget = new SsrRenderTarget();

    constructor() {
      const styleSheet = new CSSStyleSheet();
      styleSheet.replaceSync(`:host { display: contents; }`);
      this.renderTarget.adoptedStyleSheets = [styleSheet];
    }
  }
  return class BaseSsrElement extends createGenericBaseElement({
    BaseElement: BaseBaseSsrElement,
    render,
    skipOnMount: true,
  }) {};
};

/**
 * Creates a base web component element to be used in web browser environments
 * @param {Object} param
 * @param {Function} param.render - The render function to be used in the element. compliant with uhtml.render
 * @returns
 */
export const createWebComponentBaseElement = ({ render, styleSheet }) => {
  let actualStyleSheet;

  if (styleSheet) {
    actualStyleSheet = styleSheet;
  } else {
    actualStyleSheet = new CSSStyleSheet();
    actualStyleSheet.replaceSync(`:host { display: contents; }`);
  }

  return class BaseWebComponentElement extends createGenericBaseElement({
    BaseElement: HTMLElement,
    render,
    skipOnMount: false,
  }) {
    static get observedAttributes() {
      return ["key"];
    }

    constructor() {
      super();
      this.renderTarget = this.attachShadow({ mode: "closed" });
    }

    connectedCallback() {
      this.renderTarget.adoptedStyleSheets = [actualStyleSheet];
      this.baseOnMount();
    }

    disconnectedCallback() {
      this.baseOnUnmount();
    }

    attributeChangedCallback() {
      setTimeout(() => {
        this.reRender();
      }, 0);
    }
  };
};

/**
 * Creates a base web component element to be used in environments
 * where the output is strings such as server side rendering environments
 * @param {Object} param
 * @param {Object} param.BaseElement - The base element to be used in the element.
 * @param {Function} param.render - The render function to be used in the element. compliant with uhtml.render
 * @param {Boolean} param.skipOnMount - Whether to skip the onMount callback. Default is false.
 * @returns 
 */
export const createGenericBaseElement = ({ BaseElement, render, skipOnMount = false }) => {
  class GenericBaseElement extends BaseElement {

    _renderKey = 0;
    _unmountCallback;
    // renderTarget;
    disableFirstAutomatedRender = false;

    get renderKey() {
      return String(this._renderKey);
    }

    baseOnMount = () => {
      if (!skipOnMount && this.onMount) {
        this._unmountCallback = this.onMount();
      }

      if (!this.disableFirstAutomatedRender) {
        this.reRender();
      }

      if (this.attachedObservables) {
        if (Array.isArray(this.attachedObservables)) {
          this.unsubscribe = subscribeAll(this.attachedObservables);
        } else {
          this.unsubscribe = subscribeAll(this.attachedObservables());
        }
      } else if (this.subscriptions) {
        this.unsubscribe = subscribeAll(this.subscriptions);
      }
    };

    baseOnUnmount = () => {
      if (this._unmountCallback) {
        this._unmountCallback();
      }
      if (this.onUnmount) {
        this.onUnmount();
      }
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    };

    /**
     * @deprecated
     * @see reRender
     */
    triggerRender = () => {
      this.reRender();
    };

    /**
     * ReRenders the component
     */
    reRender = () => {
      this._renderKey++;
      render(this.renderTarget, this.render());
    };
  }

  return GenericBaseElement;
};
