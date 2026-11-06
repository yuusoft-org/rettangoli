import { fake, record } from "../../trace.js";

record("import", "@rettangoli/sites/cli");

export const buildSite = fake("buildSite");
export const watchSite = fake("watchSite");
export const initSite = fake("initSite");
