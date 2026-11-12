import { expect, it, vi } from "vitest";
import { bindStore } from "@rettangoli/fe/testing";
import * as todoListStore from "./todoList.store.js";
import { handleClear } from "./todoList.handlers.js";

it("clears the items and renders", () => {
  const store = bindStore(todoListStore, { heading: "Today" }, { maxItems: 2 });
  store.addItem({ label: "Write tests" });
  const render = vi.fn();

  handleClear({ store, render });

  expect(store.getState().items).toEqual([]);
  expect(render).toHaveBeenCalledTimes(1);
});
