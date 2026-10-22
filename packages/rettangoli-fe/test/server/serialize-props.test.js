import { describe, expect, it } from "vitest";

import { renderComponent } from "../../src/server/index.js";

const root = {
  schema: {
    componentName: "x-root",
    propsSchema: {
      type: "object",
      properties: { route: {}, snapshot: {}, missing: {} },
    },
  },
  view: { refs: {}, styles: {}, template: [{ p: "${route}" }] },
  store: { selectViewData: ({ props }) => ({ route: props.route }) },
  handlers: {},
  methods: {},
};

const propsScriptOf = (html) =>
  html.match(/<script type="application\/json" data-rtgl-props="">(.*?)<\/script>/)?.[1];

describe("renderComponent serializeProps", () => {
  it("writes no props script unless asked", () => {
    const { html } = renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a" },
    });
    expect(html).not.toContain("data-rtgl-props");
  });

  it("writes the root's defined schema props as JSON after its shadow root", () => {
    const { html } = renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a", snapshot: { ids: [1, 2], title: null }, extra: "dropped" },
      serializeProps: true,
    });
    expect(html.indexOf("</template>")).toBeLessThan(
      html.indexOf('<script type="application/json" data-rtgl-props'),
    );
    // The host is marked, so the runtime knows to look for them.
    expect(html.startsWith('<x-root data-rtgl-hydrate="" data-rtgl-props="">')).toBe(true);
    expect(JSON.parse(propsScriptOf(html))).toEqual({
      route: "/a",
      snapshot: { ids: [1, 2], title: null },
    });
  });

  it("escapes text that could end the script or open a comment", () => {
    const value = "</script><!-- & \u2028 \u2029 >";
    const { html } = renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a", snapshot: { value } },
      serializeProps: true,
    });
    const json = propsScriptOf(html);
    expect(json).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(json).snapshot.value).toBe(value);
  });

  it.each([
    ["a function", { onPick: () => {} }, /root prop "snapshot"\.onPick is a function/],
    ["a Date", { at: new Date(0) }, /root prop "snapshot"\.at is Date/],
    ["a Map", { byId: new Map() }, /root prop "snapshot"\.byId is Map/],
    ["NaN", { count: Number.NaN }, /root prop "snapshot"\.count is NaN/],
    ["undefined in an array", { ids: [1, undefined] }, /root prop "snapshot"\.ids\[1\] is undefined/],
  ])("refuses %s, which JSON would change", (_label, snapshot, message) => {
    expect(() => renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a", snapshot },
      serializeProps: true,
    })).toThrow(message);
  });

  it("skips undefined object fields like JSON does", () => {
    const { html } = renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a", snapshot: { kept: 1, gone: undefined } },
      serializeProps: true,
    });
    expect(JSON.parse(propsScriptOf(html))).toEqual({ route: "/a", snapshot: { kept: 1 } });
  });

  it.each([
    ["a hole in an array", { ids: [1, , 3] }, /root prop "snapshot"\.ids\[1\] is a hole/],
    ["-0", { count: -0 }, /root prop "snapshot"\.count is -0/],
  ])("refuses %s, which JSON would change", (_label, snapshot, message) => {
    expect(() => renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a", snapshot },
      serializeProps: true,
    })).toThrow(message);
  });

  it("names a cycle instead of overflowing the stack", () => {
    const snapshot = { name: "loop" };
    snapshot.self = snapshot;
    expect(() => renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a", snapshot },
      serializeProps: true,
    })).toThrow(/root prop "snapshot"\.self refers back to itself/);
  });

  it("allows the same object twice when it isn't a cycle", () => {
    const shared = { id: 1 };
    const { html } = renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/a", snapshot: { a: shared, b: shared } },
      serializeProps: true,
    });
    expect(JSON.parse(propsScriptOf(html)).snapshot).toEqual({ a: { id: 1 }, b: { id: 1 } });
  });

  it("serializes what the server rendered with: props over attributes", () => {
    const { html } = renderComponent({
      component: "x-root",
      components: [root],
      props: { route: "/from-props" },
      attributes: { route: "/from-attribute", snapshot: "from-attribute" },
      serializeProps: true,
    });
    expect(JSON.parse(propsScriptOf(html))).toEqual({
      route: "/from-props",
      snapshot: "from-attribute",
    });
  });

  it("gives an ssr: false root its props too", () => {
    const clientOnly = {
      ...root,
      schema: { ...root.schema, componentName: "x-client-root", ssr: false },
    };
    const { html } = renderComponent({
      component: "x-client-root",
      components: [clientOnly],
      props: { route: "/a" },
      serializeProps: true,
    });
    expect(html).toBe(
      '<x-client-root data-rtgl-props=""><script type="application/json" data-rtgl-props="">{"route":"/a"}</script></x-client-root>',
    );
    expect(renderComponent({ component: "x-client-root", components: [clientOnly] }).html)
      .toBe("<x-client-root></x-client-root>");
  });
});
