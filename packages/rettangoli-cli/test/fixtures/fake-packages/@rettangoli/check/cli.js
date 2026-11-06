import { fake, record } from "../../trace.js";

record("import", "@rettangoli/check/cli");

export const check = fake("check");
