import { describe, expect, it } from "vitest";
import { h } from "snabbdom/build/h.js";

import { serializeVNode } from "../../src/core/server/serializeVNode.js";

describe("serializeVNode: escaping", () => {
  it("escapes text so markup cannot be injected", () => {
    expect(serializeVNode(h("div", {}, ["<script>alert(1)</script>"])))
      .toBe("<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>");
  });

  it("escapes quotes in attribute values so they cannot break out", () => {
    const html = serializeVNode(h("div", { attrs: { title: '" onload="alert(1)' } }, ["x"]));
    expect(html).toBe('<div title="&quot; onload=&quot;alert(1)">x</div>');

    const openTag = html.slice(0, html.indexOf(">") + 1);
    // One attribute on the tag, and exactly two raw quotes: the delimiters.
    // The payload's own quotes became &quot;, so it cannot start a new
    // attribute -- which is what makes the injected `onload=` inert text.
    expect(openTag.match(/\s[a-zA-Z-]+="/g)).toHaveLength(1);
    expect(openTag.match(/"/g)).toHaveLength(2);
  });

  it("escapes ampersands in both text and attributes", () => {
    expect(serializeVNode(h("a", { attrs: { href: "/a?x=1&y=2" } }, ["A&B"])))
      .toBe('<a href="/a?x=1&amp;y=2">A&amp;B</a>');
  });

  it("escapes an already-escaped entity exactly once", () => {
    expect(serializeVNode(h("div", {}, ["&amp;"]))).toBe("<div>&amp;amp;</div>");
  });

  it("leaves single quotes alone because attributes are always double-quoted", () => {
    expect(serializeVNode(h("div", { attrs: { title: "it's" } }, ["x"])))
      .toBe("<div title=\"it's\">x</div>");
  });
});

describe("serializeVNode: raw text elements", () => {
  it("emits <style> content verbatim, because escaping would corrupt the CSS", () => {
    const html = serializeVNode(h("style", {}, ['.a > .b { content: "<" }']));
    expect(html).toBe('<style>.a > .b { content: "<" }</style>');
    expect(html).not.toContain("&gt;");
  });

  it("emits <script> content verbatim", () => {
    expect(serializeVNode(h("script", {}, ["if (a < b) {}"])))
      .toBe("<script>if (a < b) {}</script>");
  });

  it("refuses raw-text content that would close its own element", () => {
    expect(() => serializeVNode(h("style", {}, ["x{}</style><img onerror=alert(1)>"])))
      .toThrow(/cannot be safely serialized/);
    expect(() => serializeVNode(h("script", {}, ["</script><img onerror=alert(1)>"])))
      .toThrow(/cannot be safely serialized/);
  });

  it("still escapes textarea and title, which ARE escapable raw text", () => {
    expect(serializeVNode(h("textarea", {}, ["<b>&</b>"])))
      .toBe("<textarea>&lt;b&gt;&amp;&lt;/b&gt;</textarea>");
    expect(serializeVNode(h("title", {}, ["a < b"]))).toBe("<title>a &lt; b</title>");
  });
});

describe("serializeVNode: comments", () => {
  it("emits comment vnodes", () => {
    expect(serializeVNode({ sel: "!", text: " sep " })).toBe("<!-- sep -->");
  });

  it("refuses comment content that would terminate the comment early", () => {
    expect(() => serializeVNode({ sel: "!", text: "a--><img onerror=alert(1)>" }))
      .toThrow(/may not contain/);
    expect(() => serializeVNode({ sel: "!", text: "trailing-" })).toThrow(/may not contain/);
  });
});

describe("serializeVNode: props are never emitted", () => {
  it("drops data.props entirely, including values with no HTML form", () => {
    const html = serializeVNode(
      h("x-child", {
        props: {
          user: { name: "Ada" },
          when: new Date("1843-01-01"),
          cb: () => {},
          list: [1, 2, 3],
        },
      }),
    );
    expect(html).toBe("<x-child></x-child>");
    expect(html).not.toContain("[object Object]");
  });

  it("keeps attribute-form bindings, which the parser mirrors into attrs", () => {
    expect(serializeVNode(h("x-child", { attrs: { label: "hi" }, props: { label: "hi" } })))
      .toBe('<x-child label="hi"></x-child>');
  });

  it("never invents a lowercased duplicate of a hyphenated attribute", () => {
    // This is the concrete `snabbdom-to-html` defect: it emits `h-bc` AND
    // `hbc` from attrs+props, and both are in observedAttributes.
    const html = serializeVNode(
      h("rtgl-view", { attrs: { "h-bc": "ac" }, props: { "h-bc": "ac" } }),
    );
    expect(html).toBe('<rtgl-view h-bc="ac"></rtgl-view>');
    expect(html).not.toMatch(/\shbc=/);
  });
});

describe("serializeVNode: attribute encoding", () => {
  it("preserves empty-string attributes, which is the boolean encoding", () => {
    expect(serializeVNode(h("rtgl-view", { attrs: { wrap: "", sv: "" } })))
      .toBe('<rtgl-view wrap="" sv=""></rtgl-view>');
  });

  it("emits `true` as the boolean form", () => {
    expect(serializeVNode(h("input", { attrs: { disabled: true } })))
      .toBe('<input disabled="">');
  });

  it("omits false / null / undefined attributes", () => {
    expect(serializeVNode(h("div", { attrs: { a: false, b: null, c: undefined, d: "keep" } })))
      .toBe('<div d="keep"></div>');
  });

  it("merges data.class and an authored class into ONE class attribute", () => {
    const html = serializeVNode(
      h("div", { attrs: { class: "authored" }, class: { alpha: true, beta: false } }),
    );
    expect(html).toBe('<div class="authored alpha"></div>');
    expect(html.match(/class=/g)).toHaveLength(1);
  });

  it("renders style objects as kebab-case css and preserves custom properties", () => {
    expect(serializeVNode(h("div", { style: { display: "contents", marginTop: "4px", "--x": "1" } })))
      .toBe('<div style="display: contents; margin-top: 4px; --x: 1"></div>');
  });

  it("drops snabbdom's transition sub-objects from style", () => {
    expect(serializeVNode(
      h("div", { style: { color: "red", delayed: { opacity: "1" }, remove: { opacity: "0" }, destroy: { opacity: "0" } } }),
    )).toBe('<div style="color: red"></div>');
  });

  it("merges an attrs.style string with a data.style object", () => {
    expect(serializeVNode(h("div", { attrs: { style: "color: red;" }, style: { display: "contents" } })))
      .toBe('<div style="color: red; display: contents"></div>');
  });

  it("rejects invalid attribute names rather than emitting broken markup", () => {
    expect(serializeVNode(h("div", { attrs: { "bad name": "x", "ok": "y" } })))
      .toBe('<div ok="y"></div>');
  });
});

describe("serializeVNode: element shapes", () => {
  it("does not close void elements", () => {
    expect(serializeVNode(h("img", { attrs: { src: "/a.png" } }))).toBe('<img src="/a.png">');
    expect(serializeVNode(h("br"))).toBe("<br>");
  });

  it("serializes nested children in document order", () => {
    expect(serializeVNode(h("ul", {}, [h("li", {}, ["a"]), h("li", {}, ["b"])])))
      .toBe("<ul><li>a</li><li>b</li></ul>");
  });

  it("handles the text-on-element form h(tag, data, 'string')", () => {
    expect(serializeVNode(h("p", {}, "hello"))).toBe("<p>hello</p>");
  });

  it("returns an empty string for null/undefined", () => {
    expect(serializeVNode(null)).toBe("");
    expect(serializeVNode(undefined)).toBe("");
  });

  it("lets a caller substitute children via renderChildren", () => {
    const html = serializeVNode(h("x-host", {}, [h("span", {}, ["ignored"])]), {
      renderChildren: (vnode) => (vnode.sel === "x-host" ? "<i>substituted</i>" : null),
    });
    expect(html).toBe("<x-host><i>substituted</i></x-host>");
  });
});
