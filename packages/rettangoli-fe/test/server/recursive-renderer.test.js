import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  renderComponent,
  renderDocument,
  resolveComponentDefinition,
} from "../../src/server/index.js";

const GOLDEN_DIR = path.join(import.meta.dirname, "__goldens__");

const defineComponent = ({
  name,
  template,
  props = {},
  store = {},
  constants = {},
  styles,
  refs = {},
  ssr,
}) => ({
  constants,
  handlers: {},
  methods: {},
  schema: {
    componentName: name,
    propsSchema: {
      type: "object",
      properties: props,
    },
    ...(ssr === undefined ? {} : { ssr }),
  },
  store,
  view: { refs, styles, template },
});

const parentComponent = defineComponent({
  name: "x-parent",
  props: { greeting: {} },
  template: [
    {
      section: [
        { h1: "${heading}" },
        { "x-child :label=${childLabel}": "" },
      ],
    },
  ],
  store: {
    selectViewData: ({ props, constants, i18n }) => ({
      childLabel: { text: constants.childText },
      heading: `${props.greeting} ${i18n.title}`,
    }),
  },
});

const childComponent = defineComponent({
  name: "x-child",
  props: { label: {} },
  styles: {
    ":host": {
      display: "block",
    },
  },
  store: {
    selectViewData: ({ props }) => ({
      text: props.label.text,
    }),
  },
  template: [{ p: "${text}" }],
});

const renderParentChild = () =>
  renderComponent({
    component: "x-parent",
    components: [parentComponent, childComponent],
    constants: { childText: "nested" },
    i18n: { title: "SSR" },
    props: { greeting: "Hello" },
  });

describe("recursive server renderer", () => {
  it("matches the nested parent/child declarative-shadow-root golden", () => {
    const { head, html } = renderParentChild();
    const expected = readFileSync(
      path.join(GOLDEN_DIR, "recursive-parent-child.html"),
      "utf8",
    ).trimEnd();

    expect(head).toBe("");
    expect(html).toBe(expected);
    expect(html.match(/shadowrootmode="open"/g)).toHaveLength(2);
    expect(html.match(/data-rtgl-render-target=""/g)).toHaveLength(2);
    expect(html).toContain("<h1>Hello SSR</h1>");
    expect(html).toContain("<p>nested</p>");
    // Object-valued property bindings feed the child but never leak into HTML.
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("label=");
  });

  it("is byte-identical across repeated recursive renders", () => {
    expect(renderParentChild()).toEqual(renderParentChild());
  });

  it("accepts resolved definitions and object registries", () => {
    const resolvedParent = resolveComponentDefinition(parentComponent);
    const resolvedChild = resolveComponentDefinition(childComponent);

    const result = renderComponent({
      component: "x-parent",
      components: {
        parent: { definition: resolvedParent },
        child: { definition: resolvedChild },
      },
      constants: { childText: "nested" },
      i18n: { title: "SSR" },
      props: { greeting: "Hello" },
    });

    expect(result).toEqual(renderParentChild());
  });

  it("leaves unregistered custom elements as ordinary markup", () => {
    const root = defineComponent({
      name: "x-root",
      template: [{ "third-party-widget :payload=${payload}": [{ span: "light" }] }],
      store: {
        selectViewData: () => ({ payload: { private: true } }),
      },
    });

    const { html } = renderComponent({
      component: "x-root",
      components: [root],
    });
    expect(html).toContain(
      "<third-party-widget><span>light</span></third-party-widget>",
    );
    expect(html).not.toContain("[object Object]");
  });

  it("does not construct client action listeners while recursively rendering", () => {
    const root = defineComponent({
      name: "x-root",
      refs: {
        saveButton: {
          eventListeners: {
            click: { action: "save" },
          },
        },
      },
      template: [{ "button#saveButton": "Save" }],
    });

    const { html } = renderComponent({
      component: "x-root",
      components: [root],
    });
    expect(html).toContain('<button id="saveButton">Save</button>');
    expect(html).not.toMatch(/\son[a-z]+=/);
  });

  it("uses root attributes as schema-prop fallbacks", () => {
    const root = defineComponent({
      name: "x-root",
      props: { displayLabel: {} },
      store: {
        selectViewData: ({ props }) => ({ label: props.displayLabel }),
      },
      template: [{ p: "${label}" }],
    });

    const { html } = renderComponent({
      component: "x-root",
      components: [root],
      attributes: { "display-label": "From attribute" },
    });
    expect(html).toContain("<p>From attribute</p>");
  });

  it("only resolves component tags in the HTML namespace", () => {
    const root = defineComponent({
      name: "x-root",
      template: [
        { svg: [{ "x-leaf": "" }] },
        { "x-leaf": "" },
      ],
    });
    const leaf = defineComponent({
      name: "x-leaf",
      template: [{ p: "HTML leaf" }],
    });

    const { html } = renderComponent({
      component: "x-root",
      components: [root, leaf],
    });
    expect(html).toContain("<svg><x-leaf></x-leaf></svg>");
    expect(html.match(/shadowrootmode="open"/g)).toHaveLength(2);
    expect(html.match(/<p>HTML leaf<\/p>/g)).toHaveLength(1);
  });

  it("renders ssr:false components as bare, unmarked hosts without running their store", () => {
    const clientOnly = defineComponent({
      name: "x-client-only",
      ssr: false,
      template: [{ p: "never rendered" }],
      store: {
        createInitialState: () => {
          throw new Error("client-only store ran");
        },
      },
    });
    const root = defineComponent({
      name: "x-root",
      template: [
        {
          "x-client-only data-rtgl-hydrate=forged": [
            { span: "also omitted" },
          ],
        },
      ],
    });

    const { html } = renderComponent({
      component: "x-root",
      components: [root, clientOnly],
    });
    expect(html).toContain("<x-client-only></x-client-only>");
    expect(html).not.toContain("never rendered");
    expect(html).not.toContain("also omitted");
    expect(html.match(/data-rtgl-hydrate=""/g)).toHaveLength(1);
  });

  it("renders an ssr:false root as a bare host", () => {
    const clientOnly = defineComponent({
      name: "x-client-only",
      ssr: false,
      template: [{ p: "never rendered" }],
    });

    expect(
      renderComponent({
        component: "x-client-only",
        components: [clientOnly],
        attributes: {
          id: "editor",
          "data-rtgl-hydrate": "forged",
        },
      }),
    ).toEqual({
      head: "",
      html: '<x-client-only id="editor"></x-client-only>',
    });
  });

  it("fails deterministically on a component cycle", () => {
    const a = defineComponent({
      name: "x-a",
      template: [{ "x-b": "" }],
    });
    const b = defineComponent({
      name: "x-b",
      template: [{ "x-a": "" }],
    });
    const render = () =>
      renderComponent({
        component: "x-a",
        components: [a, b],
      });

    expect(render).toThrow(
      "[renderComponent] component cycle detected: x-a -> x-b -> x-a.",
    );
    expect(render).toThrow(
      "[renderComponent] component cycle detected: x-a -> x-b -> x-a.",
    );
  });

  it("fails deterministically when maxDepth is exceeded", () => {
    const a = defineComponent({
      name: "x-a",
      template: [{ "x-b": "" }],
    });
    const b = defineComponent({
      name: "x-b",
      template: [{ "x-c": "" }],
    });
    const c = defineComponent({
      name: "x-c",
      template: [{ p: "deep" }],
    });

    expect(() =>
      renderComponent({
        component: "x-a",
        components: [a, b, c],
        maxDepth: 2,
      }),
    ).toThrow(
      "[renderComponent] maximum component depth 2 exceeded at x-a -> x-b -> x-c.",
    );
  });

  it("validates registry and depth inputs with stable errors", () => {
    expect(() =>
      renderComponent({ component: "x-a" }),
    ).toThrow("`components` must be an array, object, or Map");
    expect(() =>
      renderComponent({
        component: "x-missing",
        components: [parentComponent],
      }),
    ).toThrow('unknown root component "x-missing"');
    expect(() =>
      renderComponent({
        component: "x-parent",
        components: [parentComponent, parentComponent],
      }),
    ).toThrow('duplicate component definition for "x-parent"');
    expect(() =>
      renderComponent({
        component: "x-parent",
        components: [parentComponent],
        maxDepth: 0,
      }),
    ).toThrow("`maxDepth` must be a positive integer");
  });
});

describe("renderDocument", () => {
  it("wraps trusted markup and escapes document metadata", () => {
    const document = renderDocument({
      html: "<x-root></x-root>",
      head: '<link rel="stylesheet" href="/app.css">',
      title: "A < B & C",
      lang: 'en" data-forged="yes',
      htmlAttributes: { dir: "ltr" },
      bodyAttributes: { class: "app", hidden: true },
    });

    expect(document).toBe(
      "<!doctype html>"
      + '<html dir="ltr" lang="en&quot; data-forged=&quot;yes">'
      + '<head><meta charset="utf-8"><title>A &lt; B &amp; C</title>'
      + '<link rel="stylesheet" href="/app.css"></head>'
      + '<body class="app" hidden=""><x-root></x-root></body></html>',
    );
  });

  it("requires serialized HTML and validates document attribute names", () => {
    expect(() => renderDocument()).toThrow("`html` must be a string");
    expect(() =>
      renderDocument({
        html: "",
        bodyAttributes: { "bad name": "x" },
      }),
    ).toThrow('invalid bodyAttributes name "bad name"');
  });
});
