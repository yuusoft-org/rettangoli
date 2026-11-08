/**
 * The binding grammar of a template key: the text after the selector, such as
 * `id=x :items=${items} ?open=${isOpen} disabled`. collectBindingNames reads it
 * for contracts and `rtgl check`; parseNodeBindings reads it on every render;
 * normalization reads it once per template. All three share one tokenizer
 * (src/core/view/bindingTokens.js), and these tests pin what they return,
 * quirks included.
 *
 * The golden holds one attribute string per token shape found in this
 * repository's own views, with the outputs of the code before the tokenizer
 * was shared. To rewrite it after an intended change:
 *   UPDATE_GOLDENS=1 npx vitest run test/runtime/binding-tokens.test.js
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parse as parseTemplate } from "jempl";
import { describe, expect, it } from "vitest";

import { collectBindingNames, parseNodeBindings } from "../../src/contracts/index.js";
import {
  ensureNormalizedTemplatePropertyBindings,
  findUnsupportedTemplatePropertyBindingSyntax,
} from "../../src/core/view/templatePropertyBindings.js";

const GOLDEN_PATH = path.join(import.meta.dirname, "__goldens__", "binding-tokens.json");

const settle = (fn) => {
  try {
    return fn();
  } catch (error) {
    return { error: error.message };
  }
};

const parseOn = (tagName, attrsString, options = {}) => settle(() => parseNodeBindings({
  attrsString,
  viewData: {},
  tagName,
  isWebComponent: tagName.includes("-"),
  ...options,
}));

// JSON has no undefined; keep it visible so `{ p: undefined }` differs from `{}`.
const keepUndefined = (key, value) => (value === undefined ? "[undefined]" : value);
const toJson = (value) => JSON.stringify(value, keepUndefined);

describe("binding names (collectBindingNames)", () => {
  it.each([
    ["", []],
    ["  a  ", ["a"]],
    ["a\tb\nc", ["a", "b", "c"]],
    // Assignments come first, then the words left between them.
    ["b a=1", ["a", "b"]],
    ["a b=${x y} c", ["b", "a", "c"]],
    ["a=1 a a=2", ["a"]],
    ["x=1 X=2", ["x", "X"]],
    // Assignment names keep their prefix; bare words drop `?` and skip `.x`.
    [":p=${v} ?t=${on} .d=1 ?w .x z", [":p", "?t", ".d", "w", "z"]],
    ["? :x :y=1", [":y"]],
    ["=x", [""]],
    ["?=1", ["?"]],
    ["名前 é a 1x -x", ["a"]],
    // A quoted value ends at its quote, so a word can follow without a space.
    ['a="x"b', ["a", "b"]],
    ['a="x b=1', ["a"]],
    ["a='q r' s", ["a", "s"]],
    // An interpolation is one value, whitespace and quotes included.
    [':value=${user["full name"]} disabled', [":value", "disabled"]],
    ['a=${"}" } b', ["a", "b"]],
    // A bracket path is one value; its quoted key may hold whitespace.
    [':v=user["full name"] x', [":v", "x"]],
    ['a="" b=\'\' c=', ["a", "b", "c"]],
    // Known quirk: an assignment is cut out of the leftover text at the first
    // place its text appears. Here that is inside the interpolation, which
    // leaves the word "x" behind.
    ["${c ? 1 : xa=1 } a=1", ["a", "x"]],
  ])("%j", (attrsString, expected) => {
    expect(collectBindingNames(attrsString)).toEqual(expected);
  });

  it("treats a missing string as empty", () => {
    expect(collectBindingNames()).toEqual([]);
  });

  // Out of contract, but kept as before the tokenizer was shared: a non-string
  // is read by its string form instead of throwing a TypeError.
  it("reads a non-string value by its string form", () => {
    expect(collectBindingNames(5)).toEqual([]);
    expect(collectBindingNames(true)).toEqual(["true"]);
  });
});

describe("node bindings (parseNodeBindings)", () => {
  it.each([
    ["div", "b a=1", { attrs: { a: "1", b: "" }, props: {} }],
    ["div", "a=1 a", { attrs: { a: "1" }, props: {} }],
    ["div", "a=1 a=2", { attrs: { a: "2" }, props: {} }],
    ["x-a", "a=1 a=2", { error: "[Parser] Duplicate prop binding 'a' on 'x-a'. Use only one of 'name=value' or ':name=${expr}'." }],
    ["div", 'a="x"b', { attrs: { a: "x", b: "" }, props: {} }],
    ["div", 'a="x b=1', { attrs: { a: "x b=1" }, props: {} }],
    ["div", "a\tb\nc", { attrs: { a: "", b: "", c: "" }, props: {} }],
    ["div", "a b=${x y} c", { attrs: { b: "${x y}", a: "", c: "" }, props: {} }],
    ["div", 'a=${"}" } b', { attrs: { a: '${"}" }', b: "" }, props: {} }],
    ["div", 'a="" b=\'\' c=', { attrs: { a: "", b: "", c: "" }, props: {} }],
    // `.name=value` is kept as an attribute; a bare `.name` is dropped (D24).
    ["div", ".x .y=1 z", { attrs: { ".y": "1", z: "" }, props: {} }],
    ["x-a", "on-click a-b=1", { attrs: { "a-b": "1", "on-click": "" }, props: { aB: "1", onClick: true } }],
    ["x-a", ":a-b=1 ab=2", { attrs: { ab: "2" }, props: { aB: 1, ab: "2" } }],
    ["x-a", "id=1 id", { attrs: { id: "1" }, props: {} }],
    ["x-a", "?x ?y=false ?z=${a}", { attrs: { x: "" }, props: { y: false, z: false, x: true }, toggledOff: ["y", "z"] }],
    ["div", "=x", { error: "[Parser] Invalid binding attribute name '' on 'div'." }],
    ["div", "?=1", { error: "[Parser] Invalid boolean toggle attribute name '' on 'div'." }],
    ["div", "? :x :y=1", { error: "[Parser] Invalid boolean toggle attribute name '' on 'div'." }],
    ["div", "名前 é a", { error: "[Parser] Invalid attribute token '名前' on 'div'." }],
    ["div", "?role=true", { error: "[Parser] Invalid boolean attribute '?role'. Use normal binding for value-carrying attributes such as aria-*, data-*, and role." }],
    ["div", "data-x ?data-y", { error: "[Parser] Invalid boolean attribute '?data-y'. Use normal binding for value-carrying attributes such as aria-*, data-*, and role." }],
    // A word with "=" inside an interpolation is skipped, not rejected.
    ['${c?"b=1":""} a=1', { attrs: { a: "1" }, props: {} }],
    // Known quirk: `a=1` is cut out inside the interpolation first, which
    // splits it into words and makes it an invalid token.
    ["div", '${c?"a=1":""} a=1', { error: "[Parser] Invalid attribute token '${c?\"' on 'div'." }],
    ["div", "${c ? 1 : xa=1 } a=1", { error: "[Parser] Invalid attribute token '${c' on 'div'." }],
  ].map((row) => (row.length === 2 ? ["div", ...row] : row)))("%s %j", (tagName, attrsString, expected) => {
    expect(toJson(parseOn(tagName, attrsString))).toBe(toJson(expected));
  });

  it("reads bare property values as literals or view data paths", () => {
    const result = parseNodeBindings({
      attrsString: ':n=3 :t=true :u=undefined :s=a.b :v=user["full name"] :e= x',
      viewData: { a: { b: "B" }, user: { "full name": 5 } },
      tagName: "x-a",
      isWebComponent: true,
    });
    expect(toJson(result)).toBe(toJson({
      attrs: { x: "" },
      props: { n: 3, t: true, u: undefined, s: "B", v: 5, e: "", x: true },
    }));
  });

  it("reads a non-string attrsString by its string form", () => {
    expect(toJson(parseOn("div", 5))).toBe(toJson({ error: "[Parser] Invalid attribute token '5' on 'div'." }));
  });

  it("decodes encoded attribute values, not property values", () => {
    const encoded = "__rtgl_encoded_attribute__%22a%20b%22";
    expect(toJson(parseOn("x-a", `x=${encoded} :p="${encoded}" y`, { decodeAttributeValues: true }))).toBe(toJson({
      attrs: { x: "a b", y: "" },
      props: { x: "a b", p: encoded, y: true },
    }));
  });
});

describe("property binding syntax in templates", () => {
  it.each([
    [[{ "div :p=${v}": "" }], null],
    [[{ "div :p=v": "" }], { bindingName: ":p", rawValue: "v", key: "div :p=v" }],
    [[{ 'div :p="${v}"': "" }], { bindingName: ":p", rawValue: "${v}", key: 'div :p="${v}"' }],
    [[{ "div .p=${v}": "" }], { bindingName: ".p", rawValue: "${v}", key: "div .p=${v}" }],
    [[{ "div a=1": [{ "span :q=${x} :r=": "" }] }], { bindingName: ":r", rawValue: "", key: "span :q=${x} :r=" }],
  ])("%j", (template, expected) => {
    expect(findUnsupportedTemplatePropertyBindingSyntax(template)).toEqual(expected);
    expect(findUnsupportedTemplatePropertyBindingSyntax(parseTemplate(template))).toEqual(expected);
  });

  it("rewrites property bindings in place and leaves other text alone", () => {
    const template = parseTemplate([
      { "x-a#k  :p=${v}  b=\"q r\" :n=${3} c": "" },
      { "$for item, i in items": [{ "x-b :item=${item} :at=${i} :outer=${v.w} label=${item.x}": "" }] },
    ]);
    ensureNormalizedTemplatePropertyBindings(template);
    const properties = [];
    const walk = (node) => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object") {
        if (Array.isArray(node.properties)) properties.push(...node.properties);
        Object.values(node).forEach(walk);
      }
    };
    walk(template);
    expect(properties.map(({ key }) => key)).toEqual([
      'x-a#k  :p=v  b="q r" :n=3 c',
      "x-b :item=#{item} :at=#{i} :outer=v.w label=${item.x}",
    ]);
    // Attribute values are encoded into one token each; property values are not.
    expect(properties.map(({ parsedKey }) => parsedKey)).toEqual([
      { type: 0, value: "x-a#k  :p=v  b=__rtgl_encoded_attribute__%22q%20r%22 :n=3 c" },
      {
        type: 2,
        parts: [
          { type: 2, parts: ["x-b :item=", { type: 11, path: "item" }, " :at=", { type: 11, path: "i" }, " :outer=v.w label="] },
          { type: 3, name: "__rtglEncodeAttribute", args: [{ type: 1, path: "item.x" }] },
          "",
        ],
      },
    ]);
  });
});

describe("binding golden from this repository's views", () => {
  const golden = JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
  const actual = golden.map(({ attrs }) => ({
    attrs,
    names: settle(() => collectBindingNames(attrs)),
    element: parseOn("div", attrs),
    // A component gets the same attrs (and toggledOff) plus props; only props are kept.
    component: (() => {
      const result = parseOn("x-el", attrs);
      return result.error ? result : { props: result.props };
    })(),
  }));

  if (process.env.UPDATE_GOLDENS === "1") {
    writeFileSync(GOLDEN_PATH, `[\n${actual.map((row) => `  ${toJson(row)}`).join(",\n")}\n]\n`);
  }

  it("covers a spread of token shapes", () => {
    expect(golden.length).toBeGreaterThan(70);
    expect(golden.some(({ element }) => element.error)).toBe(true);
    expect(golden.some(({ element }) => element.toggledOff)).toBe(true);
  });

  it.each(golden.map((row, index) => [index, row.attrs, row]))("#%i %s", (index, attrs, row) => {
    expect(toJson(actual[index])).toBe(toJson(row));
  });
});
