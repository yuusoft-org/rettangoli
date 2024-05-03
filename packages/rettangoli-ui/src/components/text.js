import { render, html } from "https://unpkg.com/uhtml";
import { css } from '../common.js'
import marginStyles from "../styles/marginStyles.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import cursorStyles from "../styles/cursorStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`



:host([c="on-p"]) slot {
  color: var(--color-on-primary);
}
:host([c="on-p"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-primary);
}

:host([c="on-pc"]) slot {
  color: var(--color-on-primary-container);
}
:host([c="on-pc"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-primary-container);
}

:host([c="on-s"]) slot {
  color: var(--color-on-secondary);
}
:host([c="on-s"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-secondary);
}

:host([c="on-sc"]) slot {
  color: var(--color-on-secondary-container);
}
:host([c="on-sc"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-secondary-container);
}

:host([c="on-su"]) slot {
  color: var(--color-on-surface);
}
:host([c="on-su"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-surface);
}

:host([c="on-suv"]) slot {
  color: var(--color-on-surface-variant);
}
:host([c="on-suv"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-surface-variant);
}

:host([c="i-on-su"]) slot {
  color: var(--color-inverse-on-surface);
}
:host([c="i-on-su"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-inverse-on-surface);
}

:host([c="on-e"]) slot {
  color: var(--color-on-error);
}
:host([c="on-e"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-error);
}

:host([c="on-ec"]) slot {
  color: var(--color-on-error-container);
}
:host([c="on-ec"]) a {
  text-decoration: underline;
  text-decoration-color: var(--color-on-error-container);
}

:host([s="dm"]) slot {
  font-size: var(--typography-display-m-font-size);
  font-weight: var(--typography-display-m-font-weight);
  line-height: var(--typography-display-m-line-height);
  letter-spacing: var(--typography-display-m-letter-spacing);
}

:host([s="hm"]) slot {
  font-size: var(--typography-headline-m-font-size);
  font-weight: var(--typography-headline-m-font-weight);
  line-height: var(--typography-headline-m-line-height);
  letter-spacing: var(--typography-headline-m-letter-spacing);
}

:host([s="tl"]) slot {
  font-size: var(--typography-title-l-font-size);
  font-weight: var(--typography-title-l-font-weight);
  line-height: var(--typography-title-l-line-height);
  letter-spacing: var(--typography-title-l-letter-spacing);
}

:host([s="tm"]) slot {
  font-size: var(--typography-title-m-font-size);
  font-weight: var(--typography-title-m-font-weight);
  line-height: var(--typography-title-m-line-height);
  letter-spacing: var(--typography-title-m-letter-spacing);
}

:host([s="ts"]) slot {
  font-size: var(--typography-title-s-font-size);
  font-weight: var(--typography-title-s-font-weight);
  line-height: var(--typography-title-s-line-height);
  letter-spacing: var(--typography-title-s-letter-spacing);
}

:host([s="bl"]) slot {
  font-size: var(--typography-body-l-font-size);
  font-weight: var(--typography-body-l-font-weight);
  line-height: var(--typography-body-l-line-height);
  letter-spacing: var(--typography-body-l-letter-spacing);
}

:host([s="bm"]) slot {
  font-size: var(--typography-body-m-font-size);
  font-weight: var(--typography-body-m-font-weight);
  line-height: var(--typography-body-m-line-height);
  letter-spacing: var(--typography-body-m-letter-spacing);
}

:host([s="bs"]) slot {
  font-size: var(--typography-body-s-font-size);
  font-weight: var(--typography-body-s-font-weight);
  line-height: var(--typography-body-s-line-height);
  letter-spacing: var(--typography-body-s-letter-spacing);
}

:host([s="ll"]) slot {
  font-size: var(--typography-label-l-font-size);
  font-weight: var(--typography-label-l-font-weight);
  line-height: var(--typography-label-l-line-height);
  letter-spacing: var(--typography-label-l-letter-spacing);
}

:host([s="lm"]) slot {
  font-size: var(--typography-label-m-font-size);
  font-weight: var(--typography-label-m-font-weight);
  line-height: var(--typography-label-m-line-height);
  letter-spacing: var(--typography-label-m-letter-spacing);
}



${marginStyles}
${flexChildStyles}
${cursorStyles}
`);

class RettangoliText extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
  }

  static get observedAttributes() {
    return ['key'];
  }

  connectedCallback() {
    render(this.shadow, this.render);
  }


  attributeChangedCallback(name, oldValue, newValue) {
    render(this.shadow, this.render);
  }

  render = () => {
    const href = this.getAttribute('href');

    if (href) {
      return html`
        <a href=${this.getAttribute('href')} target=${this.getAttribute('target')}>
          <slot></slot>
        </a>
      `;
    }
    return html`
      <slot></slot>
    `;
  }
}

export default RettangoliText;
