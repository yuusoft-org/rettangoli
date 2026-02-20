#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);

const getArg = (flag, fallback = "") => {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
};

const command = getArg("--cmd");
const inputPath = getArg("--input");
const artifactsRoot = getArg("--artifacts-dir", "./.rettangoli/crash-artifacts");

if (!command) {
  console.error("Missing required --cmd <shell command>.");
  process.exit(1);
}

const startedAt = new Date();
const result = spawnSync(command, {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: true,
});

if (result.status === 0) {
  console.log("No crash detected; command completed successfully.");
  process.exit(0);
}

const stamp = startedAt.toISOString().replaceAll(":", "-");
const artifactDir = path.resolve(process.cwd(), artifactsRoot, stamp);
mkdirSync(artifactDir, { recursive: true });

writeFileSync(path.join(artifactDir, "command.txt"), `${command}\n`, "utf8");
writeFileSync(path.join(artifactDir, "stdout.log"), String(result.stdout || ""), "utf8");
writeFileSync(path.join(artifactDir, "stderr.log"), String(result.stderr || ""), "utf8");

if (inputPath) {
  const resolvedInput = path.resolve(process.cwd(), inputPath);
  if (existsSync(resolvedInput)) {
    const snapshot = readFileSync(resolvedInput, "utf8");
    writeFileSync(path.join(artifactDir, "input.snapshot"), snapshot, "utf8");
  }
}

writeFileSync(path.join(artifactDir, "metadata.json"), `${JSON.stringify({
  version: 1,
  command,
  cwd: process.cwd(),
  startedAt: startedAt.toISOString(),
  endedAt: new Date().toISOString(),
  status: result.status,
  signal: result.signal || null,
}, null, 2)}\n`, "utf8");

console.error(`Crash triage artifact generated: ${artifactDir}`);
process.exit(1);
