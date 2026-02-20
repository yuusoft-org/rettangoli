#!/usr/bin/env node

import { Session } from "node:inspector";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeProject } from "../src/core/analyze.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const profileOutputPath = path.resolve(
  packageRoot,
  process.argv[2] || "test/performance-analysis.cpuprofile",
);
const scenarioDir = path.resolve(packageRoot, "test/scenarios/27-project-schema-registry-cross-component");

const main = async () => {
  const session = new Session();
  session.connect();

  const post = (method, params = {}) => new Promise((resolve, reject) => {
    session.post(method, params, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });

  await post("Profiler.enable");
  await post("Profiler.start");
  await analyzeProject({
    cwd: scenarioDir,
    dirs: ["./src/components"],
    workspaceRoot: packageRoot,
    includeYahtml: true,
    includeExpression: true,
    includeSemantic: true,
    incrementalState: { componentCache: new Map() },
  });
  const { profile } = await post("Profiler.stop");
  await post("Profiler.disable");
  session.disconnect();

  writeFileSync(profileOutputPath, JSON.stringify(profile), "utf8");
  console.log(`Performance profile written: ${profileOutputPath}`);
};

await main();
