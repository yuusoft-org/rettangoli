import { describe, expect, it } from "vitest";

import renderTabs from "../../src/primitives/tabs.js";

const stripAnsi = (value) => String(value || "").replace(/\u001b\[[0-9;]*m/g, "");

describe("rtgl-tabs primitive", () => {
  it("renders primary tabs with selected chip styling", () => {
    const output = renderTabs({
      attrs: {},
      props: {
        items: [
          { id: "tasks", label: "Tasks" },
          { id: "channels", label: "Channels" },
          { id: "members", label: "Members" },
        ],
        selectedTab: "channels",
        variant: "primary",
        w: 80,
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("Tasks");
    expect(clean).toContain("Channels");
    expect(clean).toContain("Members");
    expect(output).toContain("\u001b[100m");
    expect(output).toContain("\u001b[97m");
  });

  it("renders secondary tabs with prefix and bracketed active item", () => {
    const output = renderTabs({
      attrs: {},
      props: {
        items: [
          { id: "displays", label: "Displays" },
          { id: "audio", label: "Audio" },
        ],
        selectedTab: "audio",
        variant: "secondary",
        prefix: "Section",
        w: 80,
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("Section");
    expect(clean).toContain("Displays");
    expect(clean).toContain("[Audio]");
  });

  it("falls back to short labels and windowing when width is constrained", () => {
    const output = renderTabs({
      attrs: {},
      props: {
        items: [
          { id: "system", label: "System Overview", shortLabel: "System" },
          { id: "network", label: "Network Interfaces", shortLabel: "Network" },
          { id: "bluetooth", label: "Bluetooth Devices", shortLabel: "BT" },
          { id: "services", label: "Service Management", shortLabel: "Svc" },
          { id: "hardware", label: "Hardware Audio", shortLabel: "HW" },
        ],
        selectedTab: "bluetooth",
        variant: "primary",
        w: 24,
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("BT");
    expect(clean).toContain("...");
    expect(clean.length).toBeLessThanOrEqual(24);
  });
});
