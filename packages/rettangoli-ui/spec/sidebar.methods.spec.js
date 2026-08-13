import { describe, expect, it } from "vitest";

import {
  getScrollPosition,
  setScrollPosition,
} from "../src/components/sidebar/sidebar.methods.js";

describe("rtgl-sidebar scroll position methods", () => {
  it("reads the internal item list position", () => {
    const list = {
      scrollTop: 240,
    };

    expect(getScrollPosition.call({
      shadowRoot: {
        querySelector: () => list,
      },
    })).toEqual({ top: 240 });
  });

  it("restores and clamps the internal item list position", () => {
    const list = {
      clientHeight: 300,
      scrollHeight: 900,
      scrollTop: 0,
    };
    const sidebar = {
      shadowRoot: {
        querySelector: () => list,
      },
    };

    expect(setScrollPosition.call(sidebar, { top: 420 })).toEqual({ top: 420 });
    expect(list.scrollTop).toBe(420);

    expect(setScrollPosition.call(sidebar, { top: 800 })).toEqual({ top: 600 });
    expect(list.scrollTop).toBe(600);

    expect(setScrollPosition.call(sidebar, { top: -50 })).toEqual({ top: 0 });
    expect(list.scrollTop).toBe(0);
  });

  it("ignores invalid positions and missing render refs", () => {
    const list = {
      clientHeight: 300,
      scrollHeight: 900,
      scrollTop: 120,
    };

    expect(setScrollPosition.call({
      shadow: {
        querySelector: () => list,
      },
    }, { top: "invalid" }))
      .toEqual({ top: 120 });
    expect(setScrollPosition.call({}, { top: 100 })).toEqual({ top: 0 });
  });
});
