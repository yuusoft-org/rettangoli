import { record } from "../../trace.js";

record("import", "@rettangoli/sites/watch-client");

export function createViteWatchClientModuleSource() {
  return "// fake watch client";
}
