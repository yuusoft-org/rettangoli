import { describe, expect, it } from "vitest";
import * as cli from "../../src/cli/index.js";

describe("fe cli exports", () => {
  it("exports all expected command handlers", () => {
    expect(typeof cli.build).toBe("function");
    expect(typeof cli.check).toBe("function");
    expect(typeof cli.scaffold).toBe("function");
    expect(typeof cli.watch).toBe("function");
    expect(typeof cli.examples).toBe("function");
  });
});
