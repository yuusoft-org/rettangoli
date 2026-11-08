// Runs VT generate in <project-dir> and calls process.exit(0) while it waits for the managed
// service (as soon as the service has written <project-dir>/service.pid).
import { existsSync } from "node:fs";
import generate from "../../../src/cli/generate.js";

process.chdir(process.argv[2]);
setInterval(() => {
  if (existsSync("service.pid")) process.exit(0);
}, 20);
await generate({});
