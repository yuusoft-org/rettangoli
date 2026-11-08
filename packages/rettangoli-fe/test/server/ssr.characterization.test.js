/**
 * Records the exact output and error messages of server rendering as they are
 * today, in bare Node. Sites prerenders pages with `renderComponent`, so site
 * HTML bytes and these messages are a contract. Tests marked "known gap"
 * document verified bugs; the change that fixes one flips the assertion in a
 * reviewed test diff.
 */
import { describe, expect, it } from "vitest";

import { renderComponent, renderView } from "../../src/server/index.js";
import { COMMON_COMPONENT_STYLE_TEXT } from "../../src/core/style/commonComponentStyles.js";

const defineComponent = ({ name, template, props = {}, store = {}, ssr, refs = {}, styles }) => ({
  constants: {},
  handlers: {},
  methods: {},
  schema: {
    componentName: name,
    propsSchema: { type: "object", properties: props },
    ...(ssr === undefined ? {} : { ssr }),
  },
  store,
  view: { refs, styles, template },
});

// Every shadow root starts with the same common <style>; collapse it so the
// markup under test stays readable.
const withoutCommonStyle = (html) =>
  html.replaceAll(`<style>${COMMON_COMPONENT_STYLE_TEXT}</style>`, "<style/>");

const render = (options) => {
  const result = renderComponent(options);
  return { ...result, html: withoutCommonStyle(result.html) };
};

const panel = defineComponent({
  name: "x-panel",
  template: [{ "section.frame": [{ slot: "" }] }],
});
const box = defineComponent({
  name: "x-box",
  template: [{ "div.box": [{ slot: "" }] }],
});

describe("renderComponent output", () => {
  it("writes the shadow root of the root and of every registered component it renders", () => {
    const page = defineComponent({
      name: "x-page",
      template: [{ "x-panel": [{ h2: "Title" }, { p: "Body" }] }],
    });
    expect(render({ component: "x-page", components: [page, panel] })).toEqual({
      head: "",
      html:
        '<x-page data-rtgl-hydrate=""><template shadowrootmode="open"><style/>'
        + '<div data-rtgl-render-target="" style="display: contents">'
        + '<x-panel data-rtgl-hydrate=""><template shadowrootmode="open"><style/>'
        + '<div data-rtgl-render-target="" style="display: contents">'
        + '<section class="frame"><slot></slot></section></div></template>'
        + "<h2>Title</h2><p>Body</p></x-panel></div></template></x-page>",
    });
  });

  it("keeps the light DOM of a nested component after its shadow root", () => {
    const page = defineComponent({
      name: "x-page",
      template: [{ "x-panel": [{ "x-box": [{ "x-row": [{ p: "Leaf" }] }] }] }],
    });
    const row = defineComponent({ name: "x-row", template: [{ "div.row": [{ slot: "" }] }] });
    const { html } = render({ component: "x-page", components: [page, panel, box, row] });
    expect(html).toContain(
      '<x-box data-rtgl-hydrate=""><template shadowrootmode="open"><style/>'
      + '<div data-rtgl-render-target="" style="display: contents"><div class="box"><slot></slot></div></div></template>'
      + '<x-row data-rtgl-hydrate=""><template shadowrootmode="open"><style/>'
      + '<div data-rtgl-render-target="" style="display: contents"><div class="row"><slot></slot></div></div></template>'
      + "<p>Leaf</p></x-row></x-box>",
    );
    expect(html.match(/shadowrootmode="open"/g)).toHaveLength(4);
  });

  it("returns head as an empty string", () => {
    const page = defineComponent({ name: "x-page", template: [{ p: "x" }] });
    expect(renderComponent({ component: "x-page", components: [page] }).head).toBe("");
    const clientOnly = defineComponent({ name: "x-page", ssr: false, template: [{ p: "x" }] });
    expect(renderComponent({ component: "x-page", components: [clientOnly] }).head).toBe("");
  });

  it("starts every shadow root with the common style text", () => {
    const page = defineComponent({ name: "x-page", template: [{ "x-panel": "" }] });
    const { html } = renderComponent({ component: "x-page", components: [page, panel] });
    expect(html.split(`<style>${COMMON_COMPONENT_STYLE_TEXT}</style>`)).toHaveLength(3);
  });
});

describe("ssr: false", () => {
  const canvas = defineComponent({ name: "x-canvas", ssr: false, template: [{ canvas: "" }] });

  it("renders a root as a bare host with only the attributes it was given", () => {
    expect(render({
      component: "x-canvas",
      components: [canvas],
      attributes: { id: "c", "data-rtgl-hydrate": "forged" },
    })).toEqual({ head: "", html: '<x-canvas id="c"></x-canvas>' });
  });

  it("writes the schema props of a bare root into a props script on request", () => {
    const withProps = defineComponent({
      name: "x-canvas",
      ssr: false,
      props: { size: {} },
      template: [{ canvas: "" }],
    });
    expect(render({
      component: "x-canvas",
      components: [withProps],
      props: { size: 3, ignored: 1 },
      serializeProps: true,
    }).html).toBe(
      '<x-canvas data-rtgl-props=""><script type="application/json" data-rtgl-props="">{"size":3}</script></x-canvas>',
    );
  });

  it("renders a child as a host with the parent's light DOM and no marker", () => {
    const page = defineComponent({
      name: "x-page",
      template: [{ "x-canvas width=10": [{ b: "light" }] }],
    });
    expect(render({ component: "x-page", components: [page, canvas] }).html).toContain(
      '<div data-rtgl-render-target="" style="display: contents">'
      + '<x-canvas width="10"><b>light</b></x-canvas></div></template></x-page>',
    );
  });
});

describe("components nested through slots", () => {
  const page = defineComponent({
    name: "x-page",
    template: [{ "x-panel": [{ h2: "Outer" }, { "x-panel": [{ p: "Inner" }] }] }],
  });

  // Light DOM belongs to the view that writes it, so nesting through slots
  // is neither a cycle nor extra depth.
  const shadow = (content) =>
    '<template shadowrootmode="open"><style/>'
    + `<div data-rtgl-render-target="" style="display: contents">${content}</div></template>`;
  const panelShadow = shadow('<section class="frame"><slot></slot></section>');
  const boxShadow = shadow('<div class="box"><slot></slot></div>');

  it("renders a component slotted into its own type", () => {
    expect(render({ component: "x-page", components: [page, panel] }).html).toBe(
      '<x-page data-rtgl-hydrate="">'
      + shadow(
        `<x-panel data-rtgl-hydrate="">${panelShadow}<h2>Outer</h2>`
        + `<x-panel data-rtgl-hydrate="">${panelShadow}<p>Inner</p></x-panel></x-panel>`,
      )
      + "</x-page>",
    );
  });

  it("renders the same type slotted across a different component", () => {
    const deep = defineComponent({
      name: "x-page",
      template: [{ "x-panel": [{ "x-box": [{ "x-panel": [{ p: "Deep" }] }] }] }],
    });
    expect(render({ component: "x-page", components: [deep, panel, box] }).html).toBe(
      '<x-page data-rtgl-hydrate="">'
      + shadow(
        `<x-panel data-rtgl-hydrate="">${panelShadow}`
        + `<x-box data-rtgl-hydrate="">${boxShadow}`
        + `<x-panel data-rtgl-hydrate="">${panelShadow}<p>Deep</p></x-panel>`
        + "</x-box></x-panel>",
      )
      + "</x-page>",
    );
  });

  it("renders the same tree when the repeated component is ssr: false", () => {
    const clientPanel = defineComponent({
      name: "x-panel",
      ssr: false,
      template: [{ "section.frame": [{ slot: "" }] }],
    });
    expect(render({ component: "x-page", components: [page, clientPanel] }).html).toContain(
      '<div data-rtgl-render-target="" style="display: contents">'
      + "<x-panel><h2>Outer</h2><x-panel><p>Inner</p></x-panel></x-panel></div>",
    );
  });

  it("counts depth by views, not by nesting through the light DOM", () => {
    const row = defineComponent({ name: "x-row", template: [{ "div.row": [{ slot: "" }] }] });
    const deep = defineComponent({
      name: "x-page",
      template: [{ "x-panel": [{ "x-box": [{ "x-row": [{ p: "Leaf" }] }] }] }],
    });
    const components = [deep, panel, box, row];
    expect(() => renderComponent({ component: "x-page", components, maxDepth: 1 })).toThrow(
      new Error("[renderComponent] maximum component depth 1 exceeded at x-page -> x-panel."),
    );
    expect(() => renderComponent({ component: "x-page", components, maxDepth: 2 })).not.toThrow();
  });
});

describe("cycle and depth messages", () => {
  const chain = (...names) => names.map((name, index) => defineComponent({
    name,
    template: [index + 1 < names.length ? { [names[index + 1]]: "" } : { p: "end" }],
  }));

  it("names the path of a two-component cycle", () => {
    const [a, b] = [
      defineComponent({ name: "x-a", template: [{ "x-b": "" }] }),
      defineComponent({ name: "x-b", template: [{ "x-a": "" }] }),
    ];
    expect(() => renderComponent({ component: "x-a", components: [a, b] })).toThrow(
      new Error("[renderComponent] component cycle detected: x-a -> x-b -> x-a."),
    );
  });

  it("names the path of a self-cycle", () => {
    const a = defineComponent({ name: "x-a", template: [{ "x-a": "" }] });
    expect(() => renderComponent({ component: "x-a", components: [a] })).toThrow(
      new Error("[renderComponent] component cycle detected: x-a -> x-a."),
    );
  });

  it("names the path where maxDepth is exceeded", () => {
    expect(() => renderComponent({
      component: "x-a",
      components: chain("x-a", "x-b", "x-c"),
      maxDepth: 2,
    })).toThrow(new Error("[renderComponent] maximum component depth 2 exceeded at x-a -> x-b -> x-c."));
  });

  it("allows a chain of exactly maxDepth components", () => {
    expect(() => renderComponent({
      component: "x-a",
      components: chain("x-a", "x-b", "x-c"),
      maxDepth: 3,
    })).not.toThrow();
  });

  it("limits the default depth to 100", () => {
    const names = Array.from({ length: 101 }, (_, index) => `x-n${index}`);
    expect(() => renderComponent({ component: "x-n0", components: chain(...names) }))
      .toThrow(/^\[renderComponent\] maximum component depth 100 exceeded at x-n0 -> x-n1 -> /);
    expect(() => renderComponent({ component: "x-n0", components: chain(...names.slice(0, 100)) }))
      .not.toThrow();
  });
});

describe("the props script", () => {
  const widget = defineComponent({
    name: "x-widget",
    props: { data: {}, label: {} },
    store: { selectViewData: ({ props }) => ({ label: props.label }) },
    template: [{ p: "${label}" }],
  });

  it("writes only schema props passed as props, escaped, after the shadow root", () => {
    const { head, html } = render({
      component: "x-widget",
      components: [widget],
      props: { data: { a: "</script><b>&\u2028", n: [1, null, true] }, label: "L", ignored: 1 },
      serializeProps: true,
    });
    expect(head).toBe("");
    expect(html).toBe(
      '<x-widget data-rtgl-hydrate="" data-rtgl-props=""><template shadowrootmode="open"><style/>'
      + '<div data-rtgl-render-target="" style="display: contents"><p>L</p></div></template>'
      + '<script type="application/json" data-rtgl-props="">'
      + '{"data":{"a":"\\u003c/script\\u003e\\u003cb\\u003e\\u0026\\u2028","n":[1,null,true]},"label":"L"}'
      + "</script></x-widget>",
    );
  });

  it("writes no script unless asked, and keeps attribute-sourced values on the host", () => {
    const withoutScript = render({
      component: "x-widget",
      components: [widget],
      props: { label: "L" },
      attributes: { data: "kept" },
    }).html;
    expect(withoutScript).not.toContain("data-rtgl-props");
    expect(withoutScript).toContain('<x-widget data="kept" data-rtgl-hydrate="">');
  });

  it("refuses props that JSON cannot carry", () => {
    expect(() => renderComponent({
      component: "x-widget",
      components: [widget],
      props: { data: new Date(0) },
      serializeProps: true,
    })).toThrow("[renderComponent] root prop \"data\" is Date; serialized props must be JSON data.");
  });
});

describe("renderView", () => {
  it("renders a template to HTML inside the display: contents wrapper", () => {
    expect(renderView({
      template: [{ "div#a.b": [{ p: "${t}" }, { "button#go": "Go" }] }],
      viewData: { t: "hi <b>" },
      refs: { go: { eventListeners: { click: { action: "save" } } } },
    })).toBe(
      '<div style="display: contents"><div id="a" class="b"><p>hi &lt;b&gt;</p><button id="go">Go</button></div></div>',
    );
  });

  it("lets renderChildren replace an element's children with trusted markup", () => {
    expect(renderView({
      template: [{ "x-w": [{ p: "a" }] }, { span: "s" }],
      renderChildren: (vnode) => (vnode.sel === "x-w" ? "<i>SUB</i>" : null),
    })).toBe('<div style="display: contents"><x-w><i>SUB</i></x-w><span>s</span></div>');
  });

  it("requires a template", () => {
    expect(() => renderView({})).toThrow(new Error("[renderView] `template` is required."));
    expect(() => renderView()).toThrow(new Error("[renderView] `template` is required."));
  });
});
