import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
import { h } from "snabbdom/build/h.js";
import { expect, it, vi } from "vitest";
import { parseTemplate, parseView } from "@rettangoli/fe/testing";

const view = load(
  readFileSync(path.join(import.meta.dirname, "todoList.view.yaml"), "utf8"),
);

it("passes the items to the counter and wires the buttons", () => {
  const items = [{ label: "Write tests" }];
  const handleClear = vi.fn();
  const handleCallStoreAction = vi.fn();

  const vnode = parseView({
    h,
    template: parseTemplate(view.template),
    viewData: { heading: "Today", items, isFull: false },
    refs: view.refs,
    handlers: { handleClear, handleCallStoreAction },
  });
  const [heading, counter, list, addButton, clearButton] = vnode.children;

  expect(heading.text).toBe("Today");
  expect(counter.data.props.items).toBe(items);
  expect(list.children).toHaveLength(1);

  const event = { type: "click" };
  clearButton.data.on.click(event);
  expect(handleClear).toHaveBeenCalledWith({ _event: event });

  addButton.data.on.click(event);
  expect(handleCallStoreAction).toHaveBeenCalledWith({
    label: "New item",
    _event: event,
    _action: "addItem",
  });
});
