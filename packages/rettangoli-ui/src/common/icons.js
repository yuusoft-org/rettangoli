import { createChangeListeners } from "./changeListeners.js";

const registeredIcons = {};
const listeners = createChangeListeners();

// Adds or replaces icons by name, as SVG markup, and redraws mounted rtgl-svg
// elements. Icons registered earlier stay registered.
export const setIcons = (icons = {}) => {
  Object.assign(registeredIcons, icons);
  listeners.notify();
};

export const getRegisteredIcons = () => registeredIcons;

export const subscribeIcons = listeners.subscribe;

// The icon's markup, from setIcons or the deprecated window.rtglIcons, which
// stays supported until a major version removes it.
export const getIcon = (name) =>
  Object.hasOwn(registeredIcons, name)
    ? registeredIcons[name]
    : globalThis.rtglIcons?.[name];
