import { render, html } from "https://unpkg.com/uhtml";
import { css } from "../common.js";
import flexChildStyles from "../styles/flexChildStyles.js";
import backgroundColorStyles from "../styles/backgroundColorStyles.js";
import marginStyles from "../styles/marginStyles.js";

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(css`
  input[type="text"] {
    height: 32px;
  }

  input[type="text"],
  textarea {
    padding: 8px 8px;
    box-sizing: border-box;
    border: 1px solid var(--color-outline-variant);
    -webkit-transition: 0.3s;
    transition: 0.3s;
    outline: none;

    font-family: Roboto, -apple-system, "Helvetica Neue", sans-serif;
    font-size: var(--typography-body-m-font-size);
    font-weight: var(--typography-body-m-font-weight);
    line-height: var(--typography-body-m-line-height);
    letter-spacing: var(--typography-body-m-letter-spacing);
  }

  input[type="text"]:focus,
  textarea:focus {
    border: 1px solid var(--color-primary);
  }
  textarea {
    resize: none;
  }
  ${flexChildStyles}
  ${backgroundColorStyles}
${marginStyles}
`);

class RettangoliForm extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "closed" });
    this.shadow.adoptedStyleSheets = [styleSheet];
    this._formRef = {};
    setTimeout(() => {
      render(this.shadow, this.render);
    });
  }

  static get observedAttributes() {
    return ['key'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    render(this.shadow, this.render);
  }

  _handleRawSubmit = () => {
    const formData = new FormData(this._formRef.current);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    this.onClickSubmit && this.onClickSubmit(data);
  };

  _renderTitles = () => {
    return html`
      ${this.formSchema.title
        ? html`<rtgl-text s="tl" c="on-su">${this.formSchema.title}</rtgl-text>`
        : null}
      ${this.formSchema.subtitle
        ? html`<rtgl-text s="bm" color="on-su"
            >${this.formSchema.subtitle}</rtgl-text
          >`
        : null}
    `;
  };

  _renderFields = () => {
    return this.formSchema.fields.map((field) => {
      let inputField = null;
      if (field.type === "text") {
        inputField = html`<input
          type="${field.type}"
          name="${field.name}"
          value="${field.value}"
          placeholder="${field.options?.placeholder}"
        />`;
      } else if (field.type === "textarea") {
        inputField = html`<textarea
          name="${field.name}"
          value="${field.value}"
          rows="${field.options?.rows}"
          placeholder="${field.options?.placeholder}"
        ></textarea>`;
      }

      return html`
        <rtgl-view d="v" g="s">
          <rtgl-view d="v">
            <rtgl-text s="ll" c="on-su">${field.label}</rtgl-text>
            ${field.subLabel
              ? html`<rtgl-text s="lm" c="on-su">${field.subLabel}</rtgl-text>`
              : null}
          </rtgl-view>
          ${inputField}
        </rtgl-view>
      `;
    });
  };

  render = () => {
    const formRef = {};
    return html`
      <rtgl-view d="v" g="m" w="${this.getAttribute("width")}">
        <rtgl-view d="v"> ${this._renderTitles()} </rtgl-view>
        <form
          ref=${this._formRef}
          style="display: flex; flex-direction: column;"
        >
          <rtgl-view d="v" g="m">
            ${this._renderFields()}
            <rtgl-button t="p" onclick=${this._handleRawSubmit}>
              ${this.formSchema.submit.label}
            </rtgl-button>
          </rtgl-view>
        </form>
      </rtgl-view>
    `;
  };
}

export default RettangoliForm;
