// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
import { beforeEach, expect, it, vi } from "vitest";
import { createComponent, parseTemplate } from "@rettangoli/fe/testing";
import * as todoListStore from "./todoList.store.js";
import * as todoListHandlers from "./todoList.handlers.js";

const loadYaml = (fileName) =>
  load(readFileSync(path.join(import.meta.dirname, fileName), "utf8"));
const schema = loadYaml("todoList.schema.yaml");
const view = loadYaml("todoList.view.yaml");

beforeEach(() => {
  if (typeof globalThis.CSSStyleSheet?.prototype.replaceSync !== "function") {
    vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
  }
});

it("adds an item on click, then clears the list", () => {
  customElements.define(
    "todo-list",
    createComponent(
      {
        schema,
        view: { ...view, template: parseTemplate(view.template) },
        store: todoListStore,
        handlers: todoListHandlers,
        constants: { maxItems: 2 },
      },
      {},
    ),
  );
  const element = document.createElement("todo-list");
  element.setAttribute("heading", "Today");
  document.body.appendChild(element);
  const find = (selector) => element.renderTarget.querySelector(selector);

  expect(find("h1").textContent).toBe("Today");

  find("#addButton").click();
  expect(element.store.getState().items).toEqual([{ label: "New item" }]);
  expect(find("ul").children).toHaveLength(1);

  find("#clearButton").click();
  expect(find("ul").children).toHaveLength(0);
});
