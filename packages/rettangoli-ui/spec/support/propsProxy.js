// Gives store specs the props object a real component sees.
//
// Production stores receive `props` from fe's `createPropsProxy`: every key
// the schema declares reports `hasOwnProperty === true` (and enumerates) even
// when unset, and any other key is invisible. Plain objects in store specs do
// not behave that way. This helper gets the real proxy without a deep import
// of fe internals: it builds a throwaway component with `createComponent`
// (the same public entry the ui build uses) from the component's schema and
// reads `element.props`. Specs that use it need `// @vitest-environment jsdom`.
import path from "node:path";

import { createComponent } from "@rettangoli/fe";

import { UI_ROOT, readYamlFile } from "./mountComponent.js";

const probeTags = new Map();

const probeTagFor = (schemaFile) => {
  if (!probeTags.has(schemaFile)) {
    const { componentName, propsSchema } = readYamlFile(schemaFile);
    const probeTag = `${componentName}-props-probe`;
    customElements.define(
      probeTag,
      createComponent(
        {
          view: { template: [] },
          schema: { componentName: probeTag, propsSchema },
        },
        {},
      ),
    );
    probeTags.set(schemaFile, probeTag);
  }
  return probeTags.get(schemaFile);
};

/**
 * @param {object} plainProps Values to expose; keys outside the schema are dropped, as in production.
 * @param {string} schemaPath `*.schema.yaml`, absolute or relative to packages/rettangoli-ui.
 */
export const withPropsProxy = (plainProps, schemaPath) => {
  const element = document.createElement(
    probeTagFor(path.resolve(UI_ROOT, schemaPath)),
  );
  Object.assign(element, plainProps);
  return element.props;
};
