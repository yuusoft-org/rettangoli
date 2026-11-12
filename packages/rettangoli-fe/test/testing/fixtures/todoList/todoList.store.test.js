import { expect, it } from "vitest";
import { bindStore } from "@rettangoli/fe/testing";
import * as todoListStore from "./todoList.store.js";

it("adds items until the list is full", () => {
  const store = bindStore(todoListStore, { heading: "Today" }, { maxItems: 2 });

  const before = store.getState();
  store.addItem({ label: "Write tests" });

  expect(before.items).toHaveLength(0);
  expect(store.selectViewData()).toEqual({
    heading: "Today",
    items: [{ label: "Write tests" }],
    isFull: false,
  });

  store.addItem({ label: "Ship" });
  expect(store.selectViewData().isFull).toBe(true);

  expect(() => store.addItem("Ship")).toThrow(
    "[Store] Action 'addItem' expects payload to be an object.",
  );
});
