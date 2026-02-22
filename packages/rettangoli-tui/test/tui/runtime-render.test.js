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
      selectorOpen: { type: "boolean" },
      selectorDialogOpen: { type: "boolean" },
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
          "rtgl-selector-dialog title='Select environment' size=f open=${selectorOpen} :options=selectorOptions :selectedIndex=2": null,
        },
        {
          "rtgl-selector-dialog title='Select action' size=sm open=${selectorDialogOpen} :options=selectorDialogOptions :selectedIndex=1": null,
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
    selectorOptions: [
      { id: "local", label: "Local environment" },
      { id: "staging", label: "Staging cluster" },
      { id: "production", label: "Production cluster" },
    ],
    selectorDialogOptions: [
      { id: "open", label: "Open settings" },
      { id: "rename", label: "Rename item" },
      { id: "delete", label: "Delete item" },
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
      selectorOpen: !!props.selectorOpen,
      selectorDialogOpen: !!props.selectorDialogOpen,
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
        selectorOpen: true,
        selectorDialogOpen: true,
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
    expect(output).toContain("Select environment");
    expect(output).toContain("Staging cluster");
    expect(output).toContain("Production cluster");
    expect(output).toContain("Select action");
    expect(output).toContain("Rename item");
    expect(output).toContain("Use ArrowUp/ArrowDown and Enter to select");
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
        selectorOpen: false,
        selectorDialogOpen: false,
      },
    });

    expect(output).not.toContain("Staging cluster");
    expect(output).not.toContain("Rename item");
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
        selectorOpen: true,
        selectorDialogOpen: true,
      },
    });

    const closedOutput = runtime.render({
      componentName: schema.componentName,
      props: {
        title: "Ops",
        selectorOpen: false,
        selectorDialogOpen: false,
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
