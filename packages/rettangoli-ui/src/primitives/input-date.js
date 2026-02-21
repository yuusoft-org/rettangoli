import RettangoliInput from "./input.js";

const BaseInputElement = RettangoliInput({});
const FORCED_TYPE = "date";

class RettangoliInputDateElement extends BaseInputElement {
  connectedCallback() {
    if (this.getAttribute("type") !== FORCED_TYPE) {
      super.setAttribute("type", FORCED_TYPE);
    }
    if (super.connectedCallback) {
      super.connectedCallback();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "type" && newValue !== FORCED_TYPE) {
      if (this.getAttribute("type") !== FORCED_TYPE) {
        super.setAttribute("type", FORCED_TYPE);
      }
      return;
    }
    if (super.attributeChangedCallback) {
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  }
}

export default ({ render, html }) => {
  return RettangoliInputDateElement;
};
