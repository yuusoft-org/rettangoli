// Forward text and state to the native control in its own shadow root. IDREFs
// such as aria-labelledby cannot resolve a label in an ancestor shadow tree.
export const fieldAriaAttributes = [
  "aria-label", "aria-description", "aria-required", "aria-invalid",
];

export const fieldTextAriaAttributes = fieldAriaAttributes.filter((name) => name !== "aria-required");

export const forwardFieldAria = (control, name, value) => {
  if (!fieldAriaAttributes.includes(name)) return false;
  if (value === null) control.removeAttribute(name);
  else control.setAttribute(name, value);
  return true;
};

export const selectFieldAria = (props = {}) => ({
  ariaLabel: props.ariaLabel ?? "",
  ariaDescription: props.ariaDescription ?? "",
  ariaRequired: props.ariaRequired ?? false,
  ariaInvalid: props.ariaInvalid ?? false,
});
