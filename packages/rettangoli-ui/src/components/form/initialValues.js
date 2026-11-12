import {
  get,
  set,
  selectForm,
  collectAllDataFields,
  getDefaultValue,
  isPlainRecord,
  parseSafePath,
} from "./form.store.js";

const isObject = (value) => value !== null && typeof value === "object";

const shallowCopy = (value) =>
  Array.isArray(value)
    ? value.slice()
    : Object.assign(Object.create(Object.getPrototypeOf(value)), value);

// set() writes into the objects already on a path. Here those can belong to
// defaultValues, which holds them under one key while a dotted key, or a
// field name, points below it: { profile: { first }, "profile.last": ... }.
// defaultValues is never changed and may be frozen, so this copies each such
// object, once per `copies`, before set() writes to it.
const setWithoutSharing = (target, copies, path, value) => {
  const keys = parseSafePath(path);
  if (!keys) return;

  let current = target;
  for (const key of keys.slice(0, -1)) {
    if (!Object.prototype.hasOwnProperty.call(current, key) || !isObject(current[key])) break;
    if (!copies.has(current[key])) {
      current[key] = shallowCopy(current[key]);
      copies.add(current[key]);
    }
    current = current[key];
  }
  set(target, path, value);
};

// The values a form starts with, and returns to on reset() or a key change:
// every field shown for `defaultValues` takes its default value, or its type's
// default when it has none. `defaultValues` is the prop unless the caller
// passes the defaults that replaced it (see reset in form.methods.js). Neither
// object is changed.
export const computeInitialValues = (props, defaultValuesOverride) => {
  const defaultValues = defaultValuesOverride || props?.defaultValues || {};
  const copies = new WeakSet();

  // The defaults as one nested object, which decides the fields that show.
  const seededValues = {};
  Object.keys(defaultValues).forEach((path) => {
    setWithoutSharing(seededValues, copies, path, defaultValues[path]);
  });
  const form = selectForm({ state: { formValues: seededValues }, props });
  const dataFields = collectAllDataFields(form.fields || []);
  const initial = {};

  for (const field of dataFields) {
    const defaultVal = get(defaultValues, field.name);
    setWithoutSharing(
      initial,
      copies,
      field.name,
      defaultVal !== undefined ? defaultVal : getDefaultValue(field),
    );
  }

  return initial;
};

// The form's own copy of the defaults given to reset({ defaultValues }), so
// the store does not hold or freeze the caller's objects and later changes to
// them do not reach the form. Objects and arrays are copied at every depth. A
// value inside them that cannot be copied, such as a function, is kept as it
// is: a form mounted with it in the defaultValues prop accepts it too, as long
// as no field uses it as its value.
export const copyDefaultValues = (defaultValues, copies = new Map()) => {
  if (!isObject(defaultValues)) return defaultValues;
  if (copies.has(defaultValues)) return copies.get(defaultValues);

  if (!Array.isArray(defaultValues) && !isPlainRecord(defaultValues)) {
    try {
      return structuredClone(defaultValues);
    } catch {
      return defaultValues;
    }
  }

  const copy = Array.isArray(defaultValues) ? [] : {};
  copies.set(defaultValues, copy);
  for (const key of Object.keys(defaultValues)) {
    Object.defineProperty(copy, key, {
      configurable: true,
      enumerable: true,
      value: copyDefaultValues(defaultValues[key], copies),
      writable: true,
    });
  }
  return copy;
};
