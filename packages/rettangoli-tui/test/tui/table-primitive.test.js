import { describe, expect, it } from "vitest";

import renderTable from "../../src/primitives/table.js";

const stripAnsi = (value) => String(value || "").replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");

describe("rtgl-table primitive", () => {
  it("supports plain variant with explicit column width and title config", () => {
    const output = renderTable({
      attrs: {},
      props: {
        w: 64,
        highlight: false,
        data: {
          variant: "plain",
          columns: [
            { key: "title", header: "Task", width: "55%", truncate: "ellipsis" },
            { key: "status", header: "Status", width: 10, align: "center", headerAlign: "center" },
            { key: "assignee", header: "Assignee", width: "*", align: "right" },
          ],
          rows: [
            {
              title: "Implement realtime sync for dashboard state",
              status: "todo",
              assignee: "alice",
            },
            {
              title: "Ship v1",
              status: "done",
              assignee: "bob",
            },
          ],
        },
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("Task");
    expect(clean).toContain("Status");
    expect(clean).toContain("Assignee");
    expect(clean).toContain("Implement realtime sync");
    expect(clean).not.toContain("┌");
    expect(clean).not.toContain("│");

    const lines = clean.split("\n");
    const firstRowCells = lines[2].split(" | ");
    expect(firstRowCells).toHaveLength(3);
    expect(firstRowCells[1].length).toBe(10);
    expect(firstRowCells[1].trim()).toBe("todo");
    expect(firstRowCells[2].trim()).toBe("alice");
    expect(firstRowCells[0]).toContain("…");
  });

  it("supports hiding header in boxed variant", () => {
    const output = renderTable({
      attrs: {},
      props: {
        w: 40,
        showHeader: false,
        highlight: false,
        data: {
          columns: [
            { key: "id", header: "Identifier" },
            { key: "value", header: "Description" },
          ],
          rows: [
            { id: "A-1", value: "hello" },
          ],
        },
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("┌");
    expect(clean).toContain("└");
    expect(clean).toContain("A-1");
    expect(clean).not.toContain("Identifier");
    expect(clean).not.toContain("Description");
  });
});
