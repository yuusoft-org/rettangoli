import { describe, expect, it } from "vitest";

import { createVirtualDom } from "../../src/parser.js";

const h = (tag, data = {}, children = []) => ({ tag, data, children });

describe("virtual dom key stability", () => {
  it("keeps child component key stable when prop shape changes", () => {
    const first = createVirtualDom({
      h,
      items: [{ "child-widget :title=title": "" }],
      refs: {},
      handlers: {},
      viewData: { title: "Hello" },
    });

    const second = createVirtualDom({
      h,
      items: [{ "child-widget": "" }],
      refs: {},
      handlers: {},
      viewData: {},
    });

    expect(first[0].data.key).toBe(second[0].data.key);
  });

  it("uses explicit id as key when available", () => {
    const nodes = createVirtualDom({
      h,
      items: [{ "child-widget#stable-id :title=title": "" }],
      refs: {},
      handlers: {},
      viewData: { title: "Hello" },
    });

    expect(nodes[0].data.key).toBe("stable-id");
  });

  it("keeps descendant key stable when parent key string changes attributes", () => {
    const first = createVirtualDom({
      h,
      items: [
        {
          "section .expanded": [{ "child-widget": "" }],
        },
      ],
      refs: {},
      handlers: {},
      viewData: {},
    });

    const second = createVirtualDom({
      h,
      items: [
        {
          section: [{ "child-widget": "" }],
        },
      ],
      refs: {},
      handlers: {},
      viewData: {},
    });

    expect(first[0].children[0].data.key).toBe(second[0].children[0].data.key);
  });
});
