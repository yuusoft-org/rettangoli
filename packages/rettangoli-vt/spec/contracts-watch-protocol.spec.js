import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RETTANGOLI_VT_WATCH_EVENT } from "../src/cli/watch-plugin.js";

// The VT watch plugin (this package) and the watch client (@rettangoli/sites)
// are released separately but talk to each other through a few shared strings.
// This pins both sides to the same protocol. The sites file is only read as text,
// and the suite is skipped when it is not part of the checkout.

const vtPluginUrl = new URL("../src/cli/watch-plugin.js", import.meta.url);
const watchClientUrl = new URL("../../rettangoli-sites/src/cli/watchClient.js", import.meta.url);
const hasWatchClient = existsSync(watchClientUrl);

// describe callbacks also run when the suite is skipped, so nothing may read the sites file unguarded.
const vtPlugin = readFileSync(vtPluginUrl, "utf8");
const watchClient = hasWatchClient ? readFileSync(watchClientUrl, "utf8") : "";

describe.skipIf(!hasWatchClient)("VT watch protocol shared with @rettangoli/sites", () => {
  it("uses the same custom event name", () => {
    expect(RETTANGOLI_VT_WATCH_EVENT).toBe("rettangoli:vt-watch");
    expect(watchClient).toContain(`eventName = '${RETTANGOLI_VT_WATCH_EVENT}'`);
    // The client asks for the current state over `<event>:state-request`; the plugin answers it.
    expect(watchClient).toContain("`${eventName}:state-request`");
    expect(vtPlugin).toContain("`${eventName}:state-request`");
  });

  it("marks entry and pending scripts with the same attributes", () => {
    for (const attribute of ["data-rtgl-watch-entry", "data-rtgl-watch-pending-script"]) {
      expect(vtPlugin, attribute).toContain(`"${attribute}"`);
      expect(watchClient, attribute).toContain(`'${attribute}'`);
    }
  });

  it("identifies the injected client script with the same attribute", () => {
    expect(vtPlugin).toContain("data-rtgl-watch-client");
    expect(watchClient).toContain("script[data-rtgl-watch-client]");
  });

  it("sends messages the client understands", () => {
    expect(vtPlugin).toContain('type: "reload-current"');
    expect(vtPlugin).toContain('type: "watch-error"');
    expect(vtPlugin).toContain('type: "watch-state"');
    expect(watchClient).toContain("data.type === 'watch-error'");
    expect(watchClient).toContain("data.type === 'watch-state'");
    expect(watchClient).toContain("data.type !== 'reload-current'");
  });

  it("agrees on the update kinds (html, assets, full)", () => {
    expect(vtPlugin).toContain('updateKind: "html"');
    expect(watchClient).toContain("data.updateKind === 'assets'");
    expect(watchClient).toContain("data.updateKind === 'full'");
  });
});
