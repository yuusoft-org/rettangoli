#!/usr/bin/env node

import { runCli } from "./src/program.js";

// Packages are imported from this file, so a missing one is reported as
// "Cannot find package ... imported from .../rtgl/cli.js".
await runCli({ load: (specifier) => import(specifier) });
