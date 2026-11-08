import RettangoliInput from "./input.js";

const BaseInputElement = RettangoliInput({});

// rtgl-input-date, rtgl-input-time and rtgl-input-datetime are rtgl-input
// with a type that the `type` attribute cannot change.
export const createForcedTypeInputBase = (forcedType) =>
  class RettangoliForcedTypeInputElement extends BaseInputElement {
    connectedCallback() {
      if (this.getAttribute("type") !== forcedType) {
        super.setAttribute("type", forcedType);
      }
      super.connectedCallback();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "type" && newValue !== forcedType) {
        if (this.getAttribute("type") !== forcedType) {
          super.setAttribute("type", forcedType);
        }
        return;
      }
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  };
