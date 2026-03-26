import { describe, expect, it } from "vitest";
import { parse } from "jempl";
import { parseView } from "../../src/parser.js";

const h = (tag, data = {}, children = []) => ({ tag, data, children });

describe("loop property bindings", () => {
  it("resolves top-level ${...} property bindings with typed values", () => {
    const template = parse([
      {
        "my-item :title=${title} :items=${items} :config=${config} :enabled=${enabled}": "",
      },
    ]);

    const vdom = parseView({
      h,
      template,
      viewData: {
        title: "Inbox",
        items: [{ id: 1 }, { id: 2 }],
        config: { dense: true },
        enabled: true,
      },
      refs: {},
      handlers: {},
    });

    expect(vdom.children[0].data.props.title).toBe("Inbox");
    expect(vdom.children[0].data.props.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(vdom.children[0].data.props.config).toEqual({ dense: true });
    expect(vdom.children[0].data.props.enabled).toBe(true);
  });

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

  it("preserves object props from loop and nested loop scopes", () => {
    const template = parse([
      {
        "section#board": [
          {
            "$for group, gi in groups": [
              {
                "group-panel#group${gi} :group=${group} :items=${group.items}": [
                  {
                    "$for item, ii in group.items": [
                      {
                        "item-row#item${gi}-${ii} :group=${group} :item=${item} :index=${ii}": "",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const viewData = {
      groups: [
        {
          title: "A",
          items: [{ label: "A-1" }, { label: "A-2" }],
        },
        {
          title: "B",
          items: [{ label: "B-1" }],
        },
      ],
    };

    const vdom = parseView({
      h,
      template,
      viewData,
      refs: {},
      handlers: {},
    });

    const groupNodes = vdom.children[0].children;

    expect(groupNodes).toHaveLength(2);
    expect(groupNodes[0].data.props.group).toEqual(viewData.groups[0]);
    expect(groupNodes[0].data.props.items).toEqual(viewData.groups[0].items);
    expect(groupNodes[0].children[0].data.props.group).toEqual(viewData.groups[0]);
    expect(groupNodes[0].children[0].data.props.item).toEqual(viewData.groups[0].items[0]);
    expect(groupNodes[1].children[0].data.props.item).toEqual(viewData.groups[1].items[0]);
  });

  it("rejects legacy property-form source syntax before render", () => {
    const template = parse([
      {
        "my-item :value=title": "",
      },
    ]);

    expect(() => {
      parseView({
        h,
        template,
        viewData: { title: "Inbox" },
        refs: {},
        handlers: {},
      });
    }).toThrow("Property-form bindings must use ':prop=${value}' syntax");
  });
});
