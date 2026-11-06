// Runs VT generate in <project-dir>. The spec sends SIGINT (Ctrl+C) while it waits for the
// managed service.
import generate from "../../../src/cli/generate.js";

process.chdir(process.argv[2]);
await generate({});
