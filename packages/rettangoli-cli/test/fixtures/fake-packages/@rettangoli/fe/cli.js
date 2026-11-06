import { fake, record } from "../../trace.js";

record("import", "@rettangoli/fe/cli");

export const build = fake("build");
export const check = fake("check");
export const scaffold = fake("scaffold");
export const watch = fake("watch");
export const examples = fake("examples");
export const resolveServeContext = fake("resolveServeContext", () => ({
  publicEntryPath: "/fake/public/main.js",
}));
