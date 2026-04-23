import { describe, expect, it } from "vitest";

import renderProgressBar from "../../src/primitives/progressBar.js";

const stripAnsi = (value) => String(value || "").replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");

describe("rtgl-progress-bar primitive", () => {
  it("renders value/max progress with default percent label", () => {
    const output = renderProgressBar({
      attrs: {},
      props: {
        label: "Upload",
        value: 30,
        max: 100,
        w: 10,
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("Upload");
    expect(clean).toContain("[███░░░░░░░]");
    expect(clean).toContain("30%");
  });

  it("supports explicit percent and color", () => {
    const output = renderProgressBar({
      attrs: {},
      props: {
        percent: 78,
        w: 10,
        color: "green",
      },
    });

    const clean = stripAnsi(output);
    expect(output).toContain("\u001b[32m");
    expect(clean).toContain("[████████░░]");
    expect(clean).toContain("78%");
  });

  it("clamps out-of-range values and can hide percent text", () => {
    const output = renderProgressBar({
      attrs: {},
      props: {
        value: 999,
        max: 10,
        w: 8,
        showPercent: false,
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("[████████]");
    expect(clean).not.toContain("%");
  });

  it("falls back to zero percent when max is invalid", () => {
    const output = renderProgressBar({
      attrs: {},
      props: {
        value: 5,
        max: 0,
        w: 6,
      },
    });

    const clean = stripAnsi(output);
    expect(clean).toContain("[░░░░░░]");
    expect(clean).toContain("0%");
  });
});
