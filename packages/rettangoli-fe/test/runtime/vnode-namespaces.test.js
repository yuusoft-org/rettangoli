import { describe, expect, it } from "vitest";
import { parse } from "jempl";
import { h } from "snabbdom/build/h.js";

import { parseView } from "../../src/parser.js";

const SVG_NAMESPACE_URI = "http://www.w3.org/2000/svg";
const MATHML_NAMESPACE_URI = "http://www.w3.org/1998/Math/MathML";

describe("vnode namespace normalization", () => {
  it("adds MathML namespaces and preserves parser integration points", () => {
    const vdom = parseView({
      h,
      template: parse([
        {
          math: [
            { mi: [{ style: "html integration child" }] },
            {
              "annotation-xml": [
                {
                  svg: [
                    {
                      foreignObject: [{ style: "html integration child" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]),
      viewData: {},
      refs: {},
      handlers: {},
    });

    const math = vdom.children[0];
    const mi = math.children[0];
    const annotation = math.children[1];
    const svg = annotation.children[0];
    const foreignObject = svg.children[0];

    expect(math.data.ns).toBe(MATHML_NAMESPACE_URI);
    expect(mi.data.ns).toBe(MATHML_NAMESPACE_URI);
    expect(mi.children[0].data.ns).toBeUndefined();
    expect(annotation.data.ns).toBe(MATHML_NAMESPACE_URI);
    expect(svg.data.ns).toBe(SVG_NAMESPACE_URI);
    expect(foreignObject.data.ns).toBe(SVG_NAMESPACE_URI);
    expect(foreignObject.children[0].data.ns).toBeUndefined();
  });

  it("removes snabbdom's SVG namespace beneath title and desc integration points", () => {
    const vdom = parseView({
      h,
      template: parse([
        {
          svg: [
            { title: [{ style: "html child" }] },
            { desc: [{ div: "html child" }] },
          ],
        },
      ]),
      viewData: {},
      refs: {},
      handlers: {},
    });

    const svg = vdom.children[0];
    expect(svg.data.ns).toBe(SVG_NAMESPACE_URI);
    expect(svg.children[0].data.ns).toBe(SVG_NAMESPACE_URI);
    expect(svg.children[0].children[0].data.ns).toBeUndefined();
    expect(svg.children[1].data.ns).toBe(SVG_NAMESPACE_URI);
    expect(svg.children[1].children[0].data.ns).toBeUndefined();
  });
});
