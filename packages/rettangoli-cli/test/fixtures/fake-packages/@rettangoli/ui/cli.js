import { fake, record } from "../../trace.js";

record("import", "@rettangoli/ui/cli");

export const buildSvg = fake("buildSvg");
