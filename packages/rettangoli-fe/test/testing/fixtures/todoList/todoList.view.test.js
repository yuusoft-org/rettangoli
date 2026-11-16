import { readFileSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";
import { expect, it } from "vitest";
import { renderView } from "@rettangoli/fe/testing";

const view = load(
  readFileSync(path.join(import.meta.dirname, "todoList.view.yaml"), "utf8"),
);

it("renders one row per item", () => {
  const html = renderView({
    template: view.template,
    refs: view.refs,
    viewData: {
      heading: "Today",
      items: [{ label: "Write tests" }, { label: "Ship" }],
      isFull: true,
    },
  });

  expect(html).toContain("<h1>Today</h1>");
  expect(html).toContain("<ul><li>Write tests</li><li>Ship</li></ul>");
  expect(html).toContain('<button disabled="" id="addButton">Add</button>');
});
