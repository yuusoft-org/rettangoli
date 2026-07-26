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

  it("refuses <script> content containing `<!--`, which prevents the tag closing", () => {
    // `<!--` moves the tokenizer into script-data-escaped state, so a later
    // </script> no longer closes the element and the rest of the document is
    // swallowed as script text. Confirmed in parse5, jsdom and Chromium.
    expect(() => serializeVNode(h("script", {}, ['{"a":"<!--<script>"}'])))
      .toThrow(/changes the tokenizer state/);
  });

  it("still escapes textarea and title, which ARE escapable raw text", () => {
    expect(serializeVNode(h("textarea", {}, ["<b>&</b>"])))
      .toBe("<textarea>&lt;b&gt;&amp;&lt;/b&gt;</textarea>");
    expect(serializeVNode(h("title", {}, ["a < b"]))).toBe("<title>a &lt; b</title>");
  });
});

describe("serializeVNode: foreign content (SVG / MathML)", () => {
  // <style>/<script> are RAWTEXT only in the HTML namespace. Inside <svg> or
  // <math> the tokenizer stays in data state, so emitting verbatim there
  // injects live markup -- reproduced as a working XSS in Chromium during
  // review. Namespace cannot be read off the vnode (snabbdom only stamps
  // data.ns for svg), so it is tracked structurally.
  const css = "a::after{content:'<img src=x onerror=alert(1)>'}";

  it("escapes <style> inside <svg> instead of emitting it raw", () => {
    const html = serializeVNode(h("svg", {}, [h("style", {}, [css])]));
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("escapes <style> inside <math>, which carries no data.ns at all", () => {
    const html = serializeVNode(h("math", {}, [h("style", {}, [css])]));
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("keeps raw-text semantics in the HTML namespace", () => {
    expect(serializeVNode(h("style", {}, [css]))).toContain("<img");
  });

  it.each(["foreignObject", "desc", "title"])(
    "restores HTML raw text inside svg > %s",
    (integrationPoint) => {
      const html = serializeVNode(
        h("svg", {}, [h(integrationPoint, {}, [h("style", {}, [css])])]),
      );
      expect(html).toContain("<img");
      expect(html).not.toContain("&lt;img");
    },
  );

  it.each(["mi", "mo", "mn", "ms", "mtext"])(
    "restores HTML raw text inside math > %s",
    (integrationPoint) => {
      const html = serializeVNode(
        h("math", {}, [h(integrationPoint, {}, [h("style", {}, [css])])]),
      );
      expect(html).toContain("<img");
    },
  );

  it("stays foreign through a non-integration element", () => {
    const html = serializeVNode(h("svg", {}, [h("g", {}, [h("style", {}, [css])])]));
    expect(html).toContain("&lt;img");
  });

  it("honours annotation-xml encoding", () => {
    const htmlEncoded = serializeVNode(
      h("math", {}, [
        h("annotation-xml", { attrs: { encoding: "text/html" } }, [h("style", {}, [css])]),
      ]),
    );
    expect(htmlEncoded).toContain("<img");

    const foreignEncoded = serializeVNode(
      h("math", {}, [
        h("annotation-xml", { attrs: { encoding: "application/mathml+xml" } }, [
          h("style", {}, [css]),
        ]),
      ]),
    );
    expect(foreignEncoded).toContain("&lt;img");
  });

  it("preserves the original tag case for camelCase SVG elements", () => {
    expect(serializeVNode(h("svg", {}, [h("foreignObject", {}, ["x"])])))
      .toBe("<svg><foreignObject>x</foreignObject></svg>");
  });
});

describe("serializeVNode: comments", () => {
  it("emits comment vnodes", () => {
    expect(serializeVNode({ sel: "!", text: " sep " })).toBe("<!-- sep -->");
  });

  it("refuses comment content that would terminate the comment early", () => {
    // Each of these terminates the comment early; the `>` cases were an XSS
    // hole found in review and reproduced in Chromium.
    for (const hostile of [
      "a--><img onerror=alert(1)>",   // contains --
      "trailing-",                     // ends with -
      "><img src=x onerror=alert(1)>", // comment-start state: > closes it
      "-><img src=x onerror=alert(1)>",// comment-start-dash state
      "<!-- nested",
    ]) {
      expect(() => serializeVNode({ sel: "!", text: hostile }), hostile)
        .toThrow(/terminate the comment early/);
    }
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

  it("tolerates an explicit `data: null` without crashing", () => {
    // A default parameter only applies to `undefined`, so this previously
    // threw a bare, unattributable TypeError.
    expect(serializeVNode({ sel: "div", data: null, children: [] })).toBe("<div></div>");
    expect(serializeVNode({ sel: "div", data: null, text: "x" })).toBe("<div>x</div>");
  });

  it("lets a caller substitute children via renderChildren", () => {
    const html = serializeVNode(h("x-host", {}, [h("span", {}, ["ignored"])]), {
      renderChildren: (vnode) => (vnode.sel === "x-host" ? "<i>substituted</i>" : null),
    });
    expect(html).toBe("<x-host><i>substituted</i></x-host>");
  });
});
