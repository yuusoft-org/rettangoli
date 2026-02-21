import { describe, expect, it } from "vitest";
import { parse } from "jempl";
import { parseView } from "../../src/parser.js";

const h = (tag, data = {}, children = []) => ({ tag, data, children });

describe("loop property bindings", () => {
  it("resolves :value=${todo.title} per loop item at render time", () => {
    const template = parse([
      {
        "ul#list": [
          {
            "$for todo, i in todos": [
              {
                "my-item#item${i} :value=${todo.title}": "",
              },
            ],
          },
        ],
      },
    ]);

    const vdom = parseView({
      h,
      template,
      viewData: {
        todos: [{ title: "A" }, { title: "B" }],
      },
      refs: {},
      handlers: {},
    });

    const listNode = vdom.children[0];
    const itemNodes = listNode.children;

    expect(itemNodes).toHaveLength(2);
    expect(itemNodes[0].data.props.value).toBe("A");
    expect(itemNodes[1].data.props.value).toBe("B");
    expect(itemNodes[0].data.attrs.id).toBe("item0");
    expect(itemNodes[1].data.attrs.id).toBe("item1");
  });
});
