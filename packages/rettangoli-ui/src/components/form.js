import { css } from "../common.js";
import { createWebComponentBaseElement } from "../common/BaseElement.js";
import cursorStyles from "../styles/cursorStyles.js";
import marginStyles from "../styles/marginStyles.js";

export default ({ render, html }) => {
  const styleSheet = new CSSStyleSheet();
  styleSheet.replaceSync(css`
    :host {
      display: contents;
    }
    ${marginStyles}
    ${cursorStyles}
  `);

  class RettangoliForm extends createWebComponentBaseElement({
    render,
    styleSheet,
  }) {
    form = {
      title: undefined,
      description: undefined,
      fields: [],
      actions: [],
    };

    values = {};

    fieldStates = {};

    static get observedAttributes() {
      return ["key", "w", "ellipsis"];
    }

    _onChange = (name, value) => {
      console.log("onChange", {
        name,
        value,
      });

      this.values[name] = value;

      const validations = this.form?.fields?.find(
        (field) => field.name === name
      )?.validations;

      if (validations) {
        for (const validation of validations) {
          if (validation.rule instanceof RegExp) {
            const isValid = validation.rule.test(value);
            if (!this.fieldStates[name]) {
              this.fieldStates[name] = {};
            }
            if (!isValid) {
              this.fieldStates[name].error = validation.message;
            } else {
              delete this.fieldStates[name].error;
            }
          }
        }
      }
      this.reRender();
    };

    _onSubmit = (action) => {
      if (this.onSubmit) {
        this.onSubmit({
          action,
          values: this.values,
          fieldStates: this.fieldStates,
        });
      }
    };

    render = () => {
      return html`
        <rtgl-view p="md" w="f">
          <form style="display: contents;">
            <rtgl-text s="h2">${this.form.title}</rtgl-text>
            <rtgl-text c="mu-fg">${this.form.description}</rtgl-text>
            <rtgl-view g="lg">
              ${this.form.fields.map((field) => {
                if (field.type === "groupLabel") {
                  return html`<rtgl-text s="h4">${field.content}</rtgl-text> `;
                }
                let fieldContent;
                if (field.type === "input") {
                  fieldContent = html`
                    <rtgl-input
                      .onChange=${this._onChange.bind(this, field.name)}
                      type="text"
                      name="${field.name}"
                    />
                  `;
                }
                const error = this.fieldStates?.[field?.name]?.error;
                const labelColor = error ? "de" : "fg";
                return html`
                  <rtgl-view g="md">
                    <rtgl-text s="sm" c=${labelColor}>${field.label}</rtgl-text>
                    ${fieldContent}
                    <rtgl-text s="sm" c="mu-fg">${field.description}</rtgl-text>
                    ${error
                      ? html`<rtgl-text s="sm" c="de">${error}</rtgl-text>`
                      : ""}
                  </rtgl-view>
                `;
              })}
            </rtgl-view>
            <rtgl-view g="md" mt="lg" w="f">
              ${this.form.actions.map((action) => {
                return html`<rtgl-button
                  w=${action.fill ? "f" : ""}
                  onclick=${this._onSubmit.bind(this, action.id)}
                  >${action.content}</rtgl-button
                > `;
              })}
            </rtgl-view>
          </form>
        </rtgl-view>
      `;
    };
  }

  return RettangoliForm;
};
