import { describe, expect, it } from "vitest";

import { createTerminalSession } from "../../src/tui/terminalSession.js";

const createFakeTTY = () => {
  const writes = [];
  const stdin = {
    isTTY: true,
    on() {},
    off() {},
    setRawMode() {},
    resume() {},
    pause() {},
    setEncoding() {},
  };
  const stdout = {
    isTTY: true,
    write(value) {
      writes.push(String(value));
    },
  };

  return {
    stdin,
    stdout,
    writes,
  };
};

describe("tui terminal session", () => {
  it("clears stale overlay rows even when they are below base content", () => {
    const { stdin, stdout, writes } = createFakeTTY();
    const session = createTerminalSession({
      stdin,
      stdout,
      footer: "",
    });

    session.start({ onData: () => {} });
    writes.length = 0;

    session.render(`base\n\u001b[s\u001b[20;1Hoverlay line\u001b[u`);
    writes.length = 0;

    session.render("base");

    const output = writes.join("");
    expect(output).toContain("\u001b[20;1H");
    expect(output).toContain("\u001b[2K");
  });
});
