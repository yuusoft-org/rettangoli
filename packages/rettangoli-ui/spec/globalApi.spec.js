// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { setFormMessages } from "../src/common/formMessages.js";
import { setIcons } from "../src/common/icons.js";
import { DEFAULT_UI_MESSAGES, setUiMessages } from "../src/common/uiMessages.js";
import * as packageExports from "../src/index.js";

describe("library setup functions", () => {
  it("are exposed as window.rtgl for the script-tag bundles", async () => {
    await import("../src/registerGlobalApi.js");

    expect(globalThis.rtgl).toEqual({ setFormMessages, setIcons, setUiMessages });
    expect(Object.isFrozen(globalThis.rtgl)).toBe(true);
  });

  it("are exported from the package", () => {
    expect(packageExports.setIcons).toBe(setIcons);
    expect(packageExports.setUiMessages).toBe(setUiMessages);
    expect(packageExports.setFormMessages).toBe(setFormMessages);
    expect(packageExports.DEFAULT_UI_MESSAGES).toBe(DEFAULT_UI_MESSAGES);
  });
});
