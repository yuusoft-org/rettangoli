import { describe, expect, it } from "vitest";
import { parse } from "jempl";

import { createComponent, createTuiRuntime } from "../../src/index.js";
import { deps } from "../../src/setup.js";

const schema = {
  componentName: "tui-test-card",
  propsSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      dialogOpen: { type: "boolean" },
    },
  },
};

const view = {
  refs: {},
  template: parse([
    {
      "rtgl-view d=v": [
        { "rtgl-text w=bold": "${title}" },
        { "rtgl-divider w=24": null },
        {
          "rtgl-view d=h g=sm": [
            { "rtgl-text": "left" },
            { "rtgl-divider o=v h=1": null },
            { "rtgl-text": "right" },
          ],
        },
        { "rtgl-text": "users: ${users}" },
        { "rtgl-input label=Search value=${query}": null },
        { "rtgl-list :items=items :selectedIndex=1 w=f": null },
        { "rtgl-table :data=tableData :selectedIndex=1 w=f cw=12": null },
        {
          "rtgl-textarea label=Notes :value=notes w=24 h=3 cursorRow=1 cursorCol=2 active=true": null,
        },
        {
          "rtgl-dialog title=Preview open=${dialogOpen}": [
            { "rtgl-text": "inside dialog" },
          ],
        },
      ],
    },
  ]),
};

const store = {
  createInitialState: () => ({
    users: 12,
    query: "alpha",
    notes: "alpha\nbeta",
    items: [
      { label: "ship v1", done: false },
      { label: "release notes", done: true },
    ],
    tableData: {
      columns: [
        { key: "id", label: "ID" },
        { key: "task", label: "Task" },
        { key: "status", label: "Status" },
      ],
      rows: [
        { id: "1", task: "ship v1", status: "todo" },
        { id: "2", task: "release", status: "done" },
      ],
    },
  }),
  selectViewData: ({ state, props }) => {
    return {
      ...state,
      title: props.title || "demo",
      dialogOpen: !!props.dialogOpen,
    };
  },
};

describe("tui runtime", () => {
  it("renders a component to styled string", () => {
    const ComponentClass = createComponent(
      {
        handlers: {},
        methods: {},
        constants: {},
        schema,
        view,
        store,
      },
      deps.components,
    );

    const runtime = createTuiRuntime({
      componentRegistry: {
        [schema.componentName]: ComponentClass,
      },
    });

    const output = runtime.render({
      componentName: schema.componentName,
      props: {
        title: "Ops",
        dialogOpen: true,
      },
    });

    expect(output).toContain("Ops");
    expect(output).toContain("─");
    expect(output).toContain("│");
    expect(output).toContain("users: 12");
    expect(output).toContain("Search:");
    expect(output).toContain("• [ ] ship v1");
    expect(output).toContain("• [x] release notes");
    expect(output).toContain("┌");
    expect(output).toContain("ID");
    expect(output).toContain("ship v1");
    expect(output).toContain("\u001b[46m");
    expect(output).toContain("\u001b[33m");
    expect(output).toContain("Notes:");
    expect(output).toContain("alpha");
    expect(output).toContain("Preview");
    expect(output).toContain("inside dialog");
    expect(output).toContain("╭");
    expect(output).toContain("\u001b[s");
    expect(output).toContain("\u001b[");
  });

  it("omits dialog body when closed", () => {
    const ComponentClass = createComponent(
      {
        handlers: {},
        methods: {},
        constants: {},
        schema,
        view,
        store,
      },
      deps.components,
    );

    const runtime = createTuiRuntime({
      componentRegistry: {
        [schema.componentName]: ComponentClass,
      },
    });

    const output = runtime.render({
      componentName: schema.componentName,
      props: {
        title: "Ops",
        dialogOpen: false,
      },
    });

    expect(output).not.toContain("inside dialog");
  });

  it("keeps base flow line count stable when dialog toggles", () => {
    const ComponentClass = createComponent(
      {
        handlers: {},
        methods: {},
        constants: {},
        schema,
        view,
        store,
      },
      deps.components,
    );

    const runtime = createTuiRuntime({
      componentRegistry: {
        [schema.componentName]: ComponentClass,
      },
    });

    const openOutput = runtime.render({
      componentName: schema.componentName,
      props: {
        title: "Ops",
        dialogOpen: true,
      },
    });

    const closedOutput = runtime.render({
      componentName: schema.componentName,
      props: {
        title: "Ops",
        dialogOpen: false,
      },
    });

    const openLineCount = openOutput.split("\n").length;
    const closedLineCount = closedOutput.split("\n").length;

    expect(openLineCount).toBe(closedLineCount);
  });

  it("throws for unknown component", () => {
    const runtime = createTuiRuntime();
    expect(() => runtime.render({ componentName: "unknown" })).toThrow(
      "is not registered",
    );
  });
});
