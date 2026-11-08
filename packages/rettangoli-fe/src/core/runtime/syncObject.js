// Gives `target` exactly the properties of `source` (descriptors included,
// so getters stay getters) while keeping its identity: code that holds
// `target` sees the new values. Only configurable properties are removed.
export const syncObject = (target, source) => {
  Reflect.ownKeys(target).forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor?.configurable) {
      delete target[key];
    }
  });
  Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
  return target;
};
