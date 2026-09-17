import { describe, expect, it } from "vitest";
import { parse } from "jempl";
import { parseView } from "../../src/parser.js";

const h = (tag, data = {}, children = []) => ({ tag, data, children });
const render = (template, viewData) => parseView({ h, template, viewData, refs: {}, handlers: {} });

describe("attribute interpolation boundaries", () => {
  it.each([
    "Project One",
    'A "quoted" name',
    "O'Brien's project",
    "a=b c=d",
    "",
    "line one\nline two\tend",
    "日本語 中文",
    "literal ${other} and 100% / %20",
    "unpaired surrogate \ud800",
    "__rtgl_encoded_attribute__%22literal%22",
  ])("keeps %j inside one attribute", (label) => {
    const template = parse([{ 'input placeholder=${label} data-target-name="${label}" title="Prefix ${label} suffix"': "" }]);
    const node = render(template, { label, other: "must not evaluate" }).children[0];
    expect(node.data.attrs).toEqual({
      placeholder: label,
      "data-target-name": label,
      title: `Prefix ${label} suffix`,
    });
  });

  it("keeps literal attributes intact", () => {
    const template = parse([{ 'x-item value="100% complete" title=%20 enabled': "" }]);
    const node = render(template, {}).children[0];
    expect(node.data.attrs).toEqual({ value: "100% complete", title: "%20", enabled: "" });
    expect(node.data.props).toEqual({ value: "100% complete", title: "%20", enabled: true });
  });

  it.each(["h=f w=1fg", "", undefined])("preserves dynamic attribute fragments: %j", (containerAttrString) => {
    const template = parse([{ "rtgl-view d=h ${containerAttrString} gap=sm": "" }]);
    expect(render(template, { containerAttrString }).children[0].data.attrs).toEqual({
      d: "h",
      ...(containerAttrString ? { h: "f", w: "1fg" } : {}),
      gap: "sm",
    });
  });

  it("resolves labels and optional props in nested loop scopes", () => {
    const groups = [{ items: [{ name: 'A "quoted" name', fileId: undefined }, { name: "Two words", fileId: "file-2" }] }];
    const template = parse([{ "$for group in groups": [{ "$for item in group.items": [{ 'x-item title=${item.name} :fileId=${item.fileId}': "" }] }] }]);
    const nodes = render(template, { groups }).children;
    expect(nodes.map((node) => node.data.props)).toEqual([
      { title: 'A "quoted" name', fileId: undefined },
      { title: "Two words", fileId: "file-2" },
    ]);
  });

  it("retains undefined and null optional values across repeated renders", () => {
    const template = parse([{ "x-item :fileId=${fileId} :nested=${config.fileId}": "" }]);
    for (const fileId of ["file-1", undefined, null]) {
      expect(render(template, { fileId }).children[0].data.props).toEqual({ fileId, nested: undefined });
    }
  });

  it("preserves typed literal props used by consumer views", () => {
    const template = parse([{ "x-item :showSelected=${true} :fillHeight=${false} :outputSize=${512} :offset=${-1.5} :blank=${null} :missing=${undefined} :optional=${fileId}": "" }]);
    expect(render(template, {}).children[0].data.props).toEqual({
      showSelected: true,
      fillHeight: false,
      outputSize: 512,
      offset: -1.5,
      blank: null,
      missing: undefined,
      optional: undefined,
    });
  });

  it("keeps whitespace and quoted keys inside interpolation expressions", () => {
    const template = parse([{ 'x-item title=${ label } data-name=${user["display name"]} :name=${user["display name"]}': "" }]);
    const node = render(template, { label: "Two words", user: { "display name": 'A "quoted" name' } }).children[0];
    expect(node.data.attrs).toEqual({ title: "Two words", "data-name": 'A "quoted" name' });
    expect(node.data.props.name).toBe('A "quoted" name');
  });

  it.each(["__proto__.polluted", "constructor.name"])("does not resolve unsafe path %s", (path) => {
    const template = parse([{ [`x-item :value=\${${path}}`]: "" }]);
    expect(render(template, {}).children[0].data.props).toEqual({ value: undefined });
  });
});
