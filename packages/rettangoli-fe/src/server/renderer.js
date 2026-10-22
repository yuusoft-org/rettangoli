import { parse as parseTemplate } from "jempl";
import { h } from "snabbdom/build/h.js";

import { resolveComponentDefinition } from "../core/component/resolveComponentDefinition.js";
import { bindStore } from "../core/runtime/store.js";
import { resolveConstants } from "../core/runtime/constants.js";
import { serializeVNode } from "../core/server/serializeVNode.js";
import { COMMON_COMPONENT_STYLE_TEXT } from "../core/style/commonComponentStyles.js";
import { yamlToCss } from "../core/style/yamlToCss.js";
import { parseView } from "../parser.js";

const HYDRATE_ATTRIBUTE = "data-rtgl-hydrate";
const SERVER_PROPS_ATTRIBUTE = "data-rtgl-props";
const RENDER_TARGET_ATTRIBUTE = "data-rtgl-render-target";
const DEFAULT_MAX_DEPTH = 100;
const ATTRIBUTE_NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value, key);

const toKebabCase = (value) =>
  value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const tagFromSelector = (selector) =>
  String(selector).split(/[.#]/)[0].toLowerCase();

const isResolvedDefinition = (value) =>
  value
  && typeof value === "object"
  && typeof value.elementName === "string"
  && hasOwn(value, "template");

const resolveRegistration = (value) => {
  const registration = (
    value
    && typeof value === "object"
    && (hasOwn(value, "componentConfig") || hasOwn(value, "definition"))
  )
    ? value
    : { componentConfig: value };
  const rawDefinition = registration.definition
    ?? (isResolvedDefinition(registration.componentConfig)
      ? registration.componentConfig
      : resolveComponentDefinition(registration.componentConfig || {}));
  const definition = {
    ...rawDefinition,
    propsSchemaKeys: rawDefinition.propsSchemaKeys || [],
    ssr: rawDefinition.ssr !== false,
  };

  return {
    definition,
    deps: registration.deps || {},
  };
};

const getRegistryValues = (components) => {
  if (components instanceof Map) {
    return [...components.values()];
  }
  if (Array.isArray(components)) {
    return components;
  }
  if (components && typeof components === "object") {
    return Object.values(components);
  }
  throw new Error(
    "[renderComponent] `components` must be an array, object, or Map of component configs.",
  );
};

const createRegistry = (components) => {
  const registry = new Map();

  for (const value of getRegistryValues(components)) {
    const registration = resolveRegistration(value);
    const elementName = registration.definition.elementName.toLowerCase();
    if (registry.has(elementName)) {
      throw new Error(
        `[renderComponent] duplicate component definition for "${elementName}".`,
      );
    }
    registry.set(elementName, registration);
  }

  return registry;
};

const clearHydrateAttribute = (attrs) => {
  for (const name of Object.keys(attrs)) {
    if (name.toLowerCase() === HYDRATE_ATTRIBUTE) {
      delete attrs[name];
    }
  }
};

const setHydrateAttribute = (vnode, enabled) => {
  const data = vnode.data || (vnode.data = {});
  const attrs = data.attrs || (data.attrs = {});
  clearHydrateAttribute(attrs);
  if (enabled) {
    attrs[HYDRATE_ATTRIBUTE] = "";
  }
};

const readAttributeProp = (attrs, propName) => {
  const read = (name) => {
    if (!hasOwn(attrs, name)) {
      return { present: false };
    }

    const value = attrs[name];
    if (value === false || value === null || value === undefined) {
      return { present: false };
    }
    if (value === true || value === "") {
      return { present: true, value: true };
    }
    return { present: true, value: String(value) };
  };

  const direct = read(propName);
  if (direct.present) {
    return direct.value;
  }

  const kebabName = toKebabCase(propName);
  const kebab = read(kebabName);
  if (kebab.present) {
    return kebab.value;
  }
  return undefined;
};

/**
 * Mirrors createPropsProxy: only schema-declared keys are visible, all declared
 * keys are enumerable, property assignments win, and attributes are fallback
 * values.
 */
const createServerProps = ({ definition, props, attrs }) => {
  const sourceProps = props && typeof props === "object" ? props : {};
  const sourceAttrs = attrs && typeof attrs === "object" ? attrs : {};

  return Object.fromEntries(
    definition.propsSchemaKeys.map((propName) => [
      propName,
      hasOwn(sourceProps, propName)
        ? sourceProps[propName]
        : readAttributeProp(sourceAttrs, propName),
    ]),
  );
};

// The root props written for the client: only those passed as props. A
// value read from an attribute stays an attribute on the host, where the
// client reads it the same way and later attribute changes still apply.
const createSerializedRootProps = ({ definition, props }) => {
  const sourceProps = props && typeof props === "object" ? props : {};
  return Object.fromEntries(
    definition.propsSchemaKeys
      .filter((propName) => hasOwn(sourceProps, propName))
      .map((propName) => [propName, sourceProps[propName]]),
  );
};

const escapeDocumentText = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeDocumentAttribute = (value) =>
  escapeDocumentText(value).replace(/"/g, "&quot;");

const attributesToString = (attributes, label) => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    throw new Error(`[renderDocument] \`${label}\` must be an object.`);
  }

  return Object.entries(attributes)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([name, value]) => {
      if (!ATTRIBUTE_NAME.test(name)) {
        throw new Error(
          `[renderDocument] invalid ${label} name ${JSON.stringify(name)}.`,
        );
      }
      return value === true || value === ""
        ? ` ${name}=""`
        : ` ${name}="${escapeDocumentAttribute(value)}"`;
    })
    .join("");
};

const assertMaxDepth = (maxDepth) => {
  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
    throw new Error("[renderComponent] `maxDepth` must be a positive integer.");
  }
};

const enterComponent = ({ elementName, path, maxDepth }) => {
  if (path.includes(elementName)) {
    throw new Error(
      `[renderComponent] component cycle detected: ${[...path, elementName].join(" -> ")}.`,
    );
  }
  const nextPath = [...path, elementName];
  if (nextPath.length > maxDepth) {
    throw new Error(
      `[renderComponent] maximum component depth ${maxDepth} exceeded at ` +
        `${nextPath.join(" -> ")}.`,
    );
  }
  return nextPath;
};

const serializeChildren = (children, options) => {
  if (!Array.isArray(children)) {
    return "";
  }
  return children.map((child) => serializeVNode(child, options)).join("");
};

const serializeLightDom = (vnode, options) => {
  if (Array.isArray(vnode.children) && vnode.children.length > 0) {
    return serializeChildren(vnode.children, options);
  }
  if (vnode.text !== undefined && vnode.text !== null) {
    return serializeVNode({ text: vnode.text }, options);
  }
  return "";
};

const describeValue = (value) => {
  if (value === undefined) return "undefined";
  if (typeof value === "function") return "a function";
  if (typeof value !== "object") return typeof value;
  return Object.getPrototypeOf(value)?.constructor?.name || "an object";
};

// Root props cross to the browser as JSON, so they must survive it unchanged:
// plain objects and arrays of strings, finite numbers, booleans and null.
// Anything JSON would drop or convert (functions, Dates, Maps, holes or
// undefined in an array, NaN, -0) would give the client different inputs from
// the server's, and a cycle can't be written at all.
const assertJsonData = (value, path, ancestors = new Set()) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error(`[renderComponent] root prop ${path} is ${Object.is(value, -0) ? "-0" : value}, which JSON can't carry.`);
    }
    return;
  }
  if (value && typeof value === "object" && ancestors.has(value)) {
    throw new Error(`[renderComponent] root prop ${path} refers back to itself; serialized props can't contain cycles.`);
  }
  if (Array.isArray(value)) {
    ancestors.add(value);
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        throw new Error(`[renderComponent] root prop ${path}[${index}] is a hole, which JSON turns into null.`);
      }
      if (value[index] === undefined) {
        throw new Error(`[renderComponent] root prop ${path}[${index}] is undefined, which JSON turns into null.`);
      }
      assertJsonData(value[index], `${path}[${index}]`, ancestors);
    }
    ancestors.delete(value);
    return;
  }
  const prototype = value && typeof value === "object" ? Object.getPrototypeOf(value) : undefined;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(
      `[renderComponent] root prop ${path} is ${describeValue(value)}; serialized props must be JSON data.`,
    );
  }
  ancestors.add(value);
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined) {
      assertJsonData(item, `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
};

// `<`, `>` and `&` are escaped as JSON unicode escapes, so the text can never
// close the script element or open a comment, and still parses to the same
// value. U+2028 and U+2029 are escaped for older JavaScript parsers.
const serializeRootProps = (rootProps) => {
  const props = {};
  for (const [key, value] of Object.entries(rootProps)) {
    if (value === undefined) continue;
    assertJsonData(value, `"${key}"`);
    props[key] = value;
  }
  const json = JSON.stringify(props)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<script type="application/json" ${SERVER_PROPS_ATTRIBUTE}="">${json}</script>`;
};

/**
 * Renders a registered component tree to nested declarative shadow roots.
 *
 * `components` accepts raw component configs, resolved definitions, or
 * `{ componentConfig, deps }` registrations. Arrays, plain objects, and Maps
 * are supported so build tools can hand their existing registry shape through
 * without installing global state.
 *
 * A root rendered on its own has no parent on the client to give it its
 * props. With `serializeProps`, its schema props are written as JSON beside
 * its shadow root, and the browser runtime assigns them before the first
 * render, so the client renders from the same inputs and adopts the markup.
 */
export const renderComponent = ({
  component,
  components,
  props = {},
  attributes = {},
  constants = {},
  i18n,
  locale,
  i18nRuntime,
  maxDepth = DEFAULT_MAX_DEPTH,
  serializeProps = false,
} = {}) => {
  if (typeof component !== "string" || component.trim() === "") {
    throw new Error("[renderComponent] `component` must be a component tag name.");
  }
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    throw new Error("[renderComponent] `attributes` must be an object.");
  }
  assertMaxDepth(maxDepth);

  const registry = createRegistry(components);
  const rootName = component.trim().toLowerCase();
  const rootRegistration = registry.get(rootName);
  if (!rootRegistration) {
    throw new Error(`[renderComponent] unknown root component "${rootName}".`);
  }

  const substitutions = new WeakMap();
  const serializerOptions = {
    renderChildren: (vnode) => {
      if (!substitutions.has(vnode)) {
        return null;
      }
      const substitution = substitutions.get(vnode);
      return substitution.shadowRoot
        + (substitution.preserveLightDom
          ? serializeLightDom(vnode, serializerOptions)
          : "");
    },
  };

  const getRuntimeContext = (registration) => {
    const runtime = i18nRuntime ?? registration.deps?.__rtglI18nRuntime;
    const messages = i18n ?? runtime?.getMessages?.() ?? {};
    return {
      messages,
      store: {
        getI18n: () => messages,
        locale: locale ?? runtime?.locale,
      },
    };
  };

  const renderShadowRoot = ({ registration, componentProps, path }) => {
    const { definition } = registration;
    const runtimeContext = getRuntimeContext(registration);
    const resolvedConstants = resolveConstants({
      setupConstants: {
        ...(registration.deps?.constants || {}),
        ...(constants || {}),
      },
      fileConstants: definition.constants,
    });
    const store = bindStore(
      definition.store,
      componentProps,
      resolvedConstants,
      runtimeContext.store,
    );
    const selectedViewData = store.selectViewData ? store.selectViewData() : {};
    const template = typeof definition.template?.type === "number"
      ? definition.template
      : parseTemplate(definition.template);
    const vnode = parseView({
      h,
      template,
      viewData: {
        ...(selectedViewData || {}),
        i18n: runtimeContext.messages,
      },
      refs: definition.refs || {},
      wireEventListeners: false,
    });

    const data = vnode.data || (vnode.data = {});
    const attrs = data.attrs || (data.attrs = {});
    attrs[RENDER_TARGET_ATTRIBUTE] = "";

    prepareTree(vnode, path);

    const componentCss = yamlToCss(definition.elementName, definition.styles);
    const cssText = componentCss
      ? `${COMMON_COMPONENT_STYLE_TEXT}\n${componentCss}`
      : COMMON_COMPONENT_STYLE_TEXT;
    const style = serializeVNode(h("style", cssText));
    const view = serializeVNode(vnode, serializerOptions);
    return `<template shadowrootmode="open">${style}${view}</template>`;
  };

  const prepareTree = (vnode, path) => {
    if (!vnode || vnode.sel === undefined || vnode.sel === "!") {
      return;
    }

    const tag = tagFromSelector(vnode.sel);
    const registration = vnode.data?.ns === undefined
      ? registry.get(tag)
      : undefined;

    if (registration) {
      const { definition } = registration;
      setHydrateAttribute(vnode, definition.ssr);

      // An opted-out component gets no shadow root, but its light DOM is
      // the parent's content and is written, so the parent can adopt it.
      if (!definition.ssr) {
        substitutions.set(vnode, {
          preserveLightDom: true,
          shadowRoot: "",
        });
        for (const child of vnode.children || []) {
          prepareTree(child, path);
        }
        return;
      }

      const childPath = enterComponent({
        elementName: definition.elementName.toLowerCase(),
        path,
        maxDepth,
      });
      const childProps = createServerProps({
        definition,
        props: vnode.data?.props,
        attrs: vnode.data?.attrs,
      });
      const shadowRoot = renderShadowRoot({
        registration,
        componentProps: childProps,
        path: childPath,
      });
      substitutions.set(vnode, {
        preserveLightDom: true,
        shadowRoot,
      });

      for (const child of vnode.children || []) {
        prepareTree(child, childPath);
      }
      return;
    }

    for (const child of vnode.children || []) {
      prepareTree(child, path);
    }
  };

  const rootAttributes = { ...attributes };
  clearHydrateAttribute(rootAttributes);
  for (const name of Object.keys(rootAttributes)) {
    if (name.toLowerCase() === SERVER_PROPS_ATTRIBUTE) delete rootAttributes[name];
  }
  // An opted-out root is a bare host, which still gets its props.
  if (!rootRegistration.definition.ssr) {
    const propsScript = serializeProps
      ? serializeRootProps(createSerializedRootProps({
        definition: rootRegistration.definition,
        props,
      }))
      : "";
    if (propsScript) rootAttributes[SERVER_PROPS_ATTRIBUTE] = "";
    return {
      head: "",
      html: serializeVNode(
        h(rootName, { attrs: rootAttributes }, []),
        { renderChildren: () => propsScript || null },
      ),
    };
  }

  rootAttributes[HYDRATE_ATTRIBUTE] = "";
  const rootPath = enterComponent({
    elementName: rootName,
    path: [],
    maxDepth,
  });
  const rootProps = createServerProps({
    definition: rootRegistration.definition,
    props,
    attrs: rootAttributes,
  });
  const shadowRoot = renderShadowRoot({
    registration: rootRegistration,
    componentProps: rootProps,
    path: rootPath,
  });
  const propsScript = serializeProps
    ? serializeRootProps(createSerializedRootProps({
      definition: rootRegistration.definition,
      props,
    }))
    : "";
  if (propsScript) rootAttributes[SERVER_PROPS_ATTRIBUTE] = "";
  const html = serializeVNode(
    h(rootName, { attrs: rootAttributes }, []),
    { renderChildren: () => shadowRoot + propsScript },
  );

  return { head: "", html };
};

/**
 * Wraps trusted renderer output in a complete HTML document.
 *
 * `html` and `head` are markup by design. Text and attribute fields are
 * escaped here; callers must only pass trusted, already-serialized markup in
 * the two raw slots.
 */
export const renderDocument = ({
  html,
  head = "",
  title,
  lang,
  htmlAttributes = {},
  bodyAttributes = {},
} = {}) => {
  if (typeof html !== "string") {
    throw new Error("[renderDocument] `html` must be a string.");
  }
  if (typeof head !== "string") {
    throw new Error("[renderDocument] `head` must be a string.");
  }

  const resolvedHtmlAttributes = { ...htmlAttributes };
  if (lang !== undefined) {
    resolvedHtmlAttributes.lang = lang;
  }
  const htmlAttrs = attributesToString(
    resolvedHtmlAttributes,
    "htmlAttributes",
  );
  const bodyAttrs = attributesToString(bodyAttributes, "bodyAttributes");
  const titleMarkup = title === undefined
    ? ""
    : `<title>${escapeDocumentText(title)}</title>`;

  return "<!doctype html>"
    + `<html${htmlAttrs}><head><meta charset="utf-8">${titleMarkup}${head}</head>`
    + `<body${bodyAttrs}>${html}</body></html>`;
};
