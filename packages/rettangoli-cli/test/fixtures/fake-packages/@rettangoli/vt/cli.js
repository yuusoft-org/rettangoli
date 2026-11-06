import { fake, record } from "../../trace.js";

record("import", "@rettangoli/vt/cli");

export const generate = fake("generate");
export const screenshot = fake("screenshot");
export const report = fake("report");
export const accept = fake("accept");
export const createRettangoliVtWatchPlugin = fake(
  "createRettangoliVtWatchPlugin",
  (args) => ({ name: "fake-vt-plugin", args }),
);
