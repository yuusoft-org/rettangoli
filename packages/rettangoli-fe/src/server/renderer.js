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
  if (hasOwn(attrs, propName)) {
    return attrs[propName] === "" ? true : attrs[propName];
  }
  const kebabName = toKebabCase(propName);
  if (hasOwn(attrs, kebabName)) {
    return attrs[kebabName] === "" ? true : attrs[kebabName];
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

/**
 * Renders a registered component tree to nested declarative shadow roots.
 *
 * `components` accepts raw component configs, resolved definitions, or
 * `{ componentConfig, deps }` registrations. Arrays, plain objects, and Maps
 * are supported so build tools can hand their existing registry shape through
 * without installing global state.
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
          ? serializeChildren(vnode.children, serializerOptions)
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

      if (!definition.ssr) {
        substitutions.set(vnode, {
          preserveLightDom: false,
          shadowRoot: "",
        });
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
  if (!rootRegistration.definition.ssr) {
    return {
      head: "",
      html: serializeVNode(h(rootName, { attrs: rootAttributes }, [])),
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
  const html = serializeVNode(
    h(rootName, { attrs: rootAttributes }, []),
    { renderChildren: () => shadowRoot },
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
