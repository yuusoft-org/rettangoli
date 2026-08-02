import {
  formatDurationMilliseconds,
  normalizeDurationMilliseconds,
  parseDurationText,
} from "../common/duration.js";
import RettangoliInput from "./input.js";

const BaseInputElement = RettangoliInput({});
const DEFAULT_PLACEHOLDER = "m:ss";
const DEFAULT_STEP_MS = 1000;

class RettangoliInputDurationElement extends BaseInputElement {
  constructor() {
    super();
    this._lastValidValueMs = null;
    this._lastCommittedValueMs = null;
    this._inputElement.addEventListener("keydown", this._onDurationKeyDown);
  }

  get value() {
    return this._lastValidValueMs;
  }

  set value(newValue) {
    this._setValueFromMilliseconds(newValue);
  }

  _dispatchDurationEvent(eventName, value) {
    this.dispatchEvent(new CustomEvent(eventName, {
      detail: { value },
      bubbles: true,
    }));
  }

  _readBound(name) {
    return normalizeDurationMilliseconds(this.getAttribute(name));
  }

  _clampValueToBounds(value) {
    let nextValue = value;
    const min = this._readBound("min");
    const max = this._readBound("max");

    if (min !== null) {
      nextValue = Math.max(nextValue, min);
    }
    if (max !== null) {
      nextValue = Math.min(nextValue, max);
    }

    return nextValue;
  }

  _readStep() {
    const step = normalizeDurationMilliseconds(this.getAttribute("step"));
    return step !== null && step > 0 ? step : DEFAULT_STEP_MS;
  }

  _setValueFromMilliseconds(value, { clamp = false, commit = true } = {}) {
    if (value === null || value === undefined || value === "") {
      this._lastValidValueMs = null;
      if (commit) {
        this._lastCommittedValueMs = null;
      }
      this._inputElement.value = "";
      return null;
    }

    const normalizedValue = normalizeDurationMilliseconds(value);
    if (normalizedValue === null) {
      this._lastValidValueMs = null;
      if (commit) {
        this._lastCommittedValueMs = null;
      }
      this._inputElement.value = "";
      return null;
    }

    const nextValue = clamp
      ? this._clampValueToBounds(normalizedValue)
      : normalizedValue;
    this._lastValidValueMs = nextValue;
    if (commit) {
      this._lastCommittedValueMs = nextValue;
    }
    this._inputElement.value = formatDurationMilliseconds(nextValue);
    return nextValue;
  }

  _restoreLastCommittedValue() {
    this._lastValidValueMs = this._lastCommittedValueMs;
    this._inputElement.value = formatDurationMilliseconds(
      this._lastCommittedValueMs,
    );
  }

  _emitValueEvent(eventName, { commit = false } = {}) {
    const inputValue = this._inputElement.value;
    if (inputValue.trim() === "") {
      this._lastValidValueMs = null;
      if (commit) {
        this._lastCommittedValueMs = null;
        this._inputElement.value = "";
      }
      this._dispatchDurationEvent(eventName, null);
      return;
    }

    const parsedValue = parseDurationText(inputValue);
    if (parsedValue === null) {
      if (commit) {
        this._restoreLastCommittedValue();
        this._dispatchDurationEvent(eventName, this._lastCommittedValueMs);
      }
      return;
    }

    const nextValue = commit
      ? this._clampValueToBounds(parsedValue)
      : parsedValue;
    this._lastValidValueMs = nextValue;

    if (commit) {
      this._lastCommittedValueMs = nextValue;
      this._inputElement.value = formatDurationMilliseconds(nextValue);
    }

    this._dispatchDurationEvent(eventName, nextValue);
  }

  _onDurationKeyDown = (event) => {
    if (event.key === "Enter") {
      this._emitValueEvent("value-change", { commit: true });
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();
    const parsedValue = parseDurationText(this._inputElement.value);
    const currentValue = parsedValue ?? this._lastValidValueMs ?? 0;
    const direction = event.key === "ArrowUp" ? 1 : -1;
    const nextUnclampedValue = Math.max(
      0,
      currentValue + (direction * this._readStep()),
    );
    const nextValue = this._setValueFromMilliseconds(nextUnclampedValue, {
      clamp: true,
    });

    this._dispatchDurationEvent("value-input", nextValue);
    this._dispatchDurationEvent("value-change", nextValue);
  };

  _syncValueAttribute() {
    this._setValueFromMilliseconds(this.getAttribute("value"));
  }

  _syncPlaceholderAttribute() {
    this._inputElement.setAttribute(
      "placeholder",
      this.getAttribute("placeholder") ?? DEFAULT_PLACEHOLDER,
    );
  }

  _updateInputAttributes() {
    this._inputElement.setAttribute("type", "text");
    this._inputElement.setAttribute("autocomplete", "off");
    this._inputElement.setAttribute("spellcheck", "false");

    if (this.hasAttribute("disabled")) {
      this._inputElement.setAttribute("disabled", "");
    } else {
      this._inputElement.removeAttribute("disabled");
    }
  }
}

export default ({ render, html }) => {
  return RettangoliInputDurationElement;
};
