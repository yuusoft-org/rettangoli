#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Minimal YAML parser (only handles scenario.yaml format)
// ---------------------------------------------------------------------------

function parseScenarioYaml(text) {
  const lines = text.split("\n");
  const dynamicFields = [];
  const steps = [];
  let mode = null;
  let currentStep = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed === "" || trimmed.startsWith("#")) continue;

    if (trimmed === "dynamicFields:") {
      mode = "dynamicFields";
      continue;
    }

    if (trimmed === "steps:") {
      mode = "steps";
      continue;
    }

    if (mode === "dynamicFields") {
      const match = trimmed.match(/^\s+-\s+(.+)$/);
      if (match) {
        dynamicFields.push(match[1].trim().replace(/^["']|["']$/g, ""));
      } else {
        mode = null;
      }
    }

    if (mode === "steps") {
      const itemMatch = trimmed.match(/^\s+-\s+command:\s+(.+)$/);
      if (itemMatch) {
        currentStep = { command: itemMatch[1].trim() };
        steps.push(currentStep);
        continue;
      }

      if (currentStep) {
        const expectedMatch = trimmed.match(/^\s+expected:\s+(.+)$/);
        if (expectedMatch) {
          currentStep.expected = expectedMatch[1].trim();
          continue;
        }

        const failMatch = trimmed.match(/^\s+expectFail:\s+(.+)$/);
        if (failMatch) {
          currentStep.expectFail = failMatch[1].trim() === "true";
          continue;
        }
      }
    }
  }

  return { dynamicFields, steps };
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

function walkDir(dir) {
  const result = [];
  function walk(current) {
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else {
        result.push(relative(dir, fullPath).replace(/\\/g, "/"));
      }
    }
  }
  if (existsSync(dir)) walk(dir);
  return result.sort();
}

// ---------------------------------------------------------------------------
// Dynamic field stripping
// ---------------------------------------------------------------------------

function shouldStrip(key, dynamicFields) {
  for (const pattern of dynamicFields) {
    if (pattern.startsWith("*")) {
      const suffix = pattern.slice(1);
      if (key.endsWith(suffix)) return true;
    } else {
      if (key === pattern) return true;
    }
  }
  return false;
}

function stripDynamicFields(obj, dynamicFields) {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => stripDynamicFields(item, dynamicFields));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (shouldStrip(key, dynamicFields)) continue;
    result[key] = stripDynamicFields(value, dynamicFields);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Directory comparison
// ---------------------------------------------------------------------------

function compareDirectories(actualDir, expectedDir, dynamicFields) {
  const actualFiles = new Set(walkDir(actualDir));
  const expectedFiles = new Set(walkDir(expectedDir));
  const errors = [];

  // Missing files (in expected but not in actual)
  for (const file of expectedFiles) {
    if (!actualFiles.has(file)) {
      errors.push(`MISSING: ${file}`);
    }
  }

  // Extra files (in actual but not in expected)
  for (const file of actualFiles) {
    if (!expectedFiles.has(file)) {
      errors.push(`EXTRA: ${file}`);
    }
  }

  // Content comparison for files present in both
  for (const file of expectedFiles) {
    if (!actualFiles.has(file)) continue;

    const actualPath = join(actualDir, file);
    const expectedPath = join(expectedDir, file);
    const ext = extname(file).toLowerCase();

    if (ext === ".webp" || ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif") {
      // Binary comparison
      const actualBuf = readFileSync(actualPath);
      const expectedBuf = readFileSync(expectedPath);
      if (!actualBuf.equals(expectedBuf)) {
        errors.push(`CONTENT MISMATCH (binary): ${file}`);
      }
    } else if (ext === ".json") {
      // JSON comparison with dynamic fields stripped
      try {
        const actualJson = JSON.parse(readFileSync(actualPath, "utf8"));
        const expectedJson = JSON.parse(readFileSync(expectedPath, "utf8"));
        const actualStripped = stripDynamicFields(actualJson, dynamicFields);
        const expectedStripped = stripDynamicFields(expectedJson, dynamicFields);
        const actualStr = JSON.stringify(actualStripped, null, 2);
        const expectedStr = JSON.stringify(expectedStripped, null, 2);
        if (actualStr !== expectedStr) {
          const maxLen = 200;
          const actualSnippet = actualStr.length > maxLen ? actualStr.slice(0, maxLen) + "..." : actualStr;
          const expectedSnippet = expectedStr.length > maxLen ? expectedStr.slice(0, maxLen) + "..." : expectedStr;
          errors.push(`CONTENT MISMATCH (json): ${file}\n    expected: ${expectedSnippet}\n    actual:   ${actualSnippet}`);
        }
      } catch (e) {
        // Fall back to text comparison if JSON parse fails
        const actualText = readFileSync(actualPath, "utf8");
        const expectedText = readFileSync(expectedPath, "utf8");
        if (actualText !== expectedText) {
          errors.push(`CONTENT MISMATCH (text, invalid json): ${file}`);
        }
      }
    } else {
      // Text comparison
      const actualText = readFileSync(actualPath, "utf8");
      const expectedText = readFileSync(expectedPath, "utf8");
      if (actualText !== expectedText) {
        errors.push(`CONTENT MISMATCH (text): ${file}`);
      }
    }
  }

  return { errors };
}

// ---------------------------------------------------------------------------
// Command execution
// ---------------------------------------------------------------------------

function runCommand(command, cwd) {
  try {
    execSync(command, { cwd, encoding: "utf-8", stdio: "pipe" });
    return 0;
  } catch (err) {
    return err.status || 1;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const e2eDir = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
  const entries = readdirSync(e2eDir);
  const scenarioDirs = entries
    .map((name) => join(e2eDir, name))
    .filter((dir) => statSync(dir).isDirectory() && existsSync(join(dir, "scenario.yaml")));

  if (scenarioDirs.length === 0) {
    console.log("No scenarios found.");
    process.exit(0);
  }

  let totalScenarios = 0;
  let passed = 0;
  const failures = [];

  for (const scenarioDir of scenarioDirs) {
    totalScenarios++;
    const scenarioName = basename(scenarioDir);
    console.log(`\nRunning scenario: ${scenarioName}`);

    const yamlText = readFileSync(join(scenarioDir, "scenario.yaml"), "utf8");
    const scenario = parseScenarioYaml(yamlText);
    const dynamicFields = scenario.dynamicFields || [];
    const workDir = join(scenarioDir, ".work");
    const initialDir = join(scenarioDir, "initial");

    // Clean slate
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
    cpSync(initialDir, workDir, { recursive: true });

    let scenarioPassed = true;
    const scenarioErrors = [];

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepLabel = `${step.expected} (${step.command})`;
      console.log(`  Step: ${step.command} → ${step.expected}`);

      // Replace $CWD with absolute work dir path
      const resolvedCommand = step.command.replaceAll("$CWD", resolve(workDir));
      const exitCode = runCommand(resolvedCommand, resolve(workDir));

      if (step.expectFail && exitCode === 0) {
        scenarioErrors.push(`${stepLabel}: expected command to fail but it exited with code 0`);
        scenarioPassed = false;
        break;
      }

      if (!step.expectFail && exitCode !== 0) {
        scenarioErrors.push(`${stepLabel}: command failed with exit code ${exitCode}`);
        scenarioPassed = false;
        break;
      }

      // Compare directories
      const expectedDir = join(scenarioDir, step.expected);
      const result = compareDirectories(resolve(workDir), expectedDir, dynamicFields);

      if (result.errors.length > 0) {
        scenarioErrors.push(`${stepLabel}:\n    ${result.errors.join("\n    ")}`);
        scenarioPassed = false;
        break;
      }

      console.log("    PASS");
    }

    if (scenarioPassed) {
      passed++;
      // Clean up on success
      rmSync(workDir, { recursive: true, force: true });
    } else {
      failures.push({ name: scenarioName, errors: scenarioErrors });
      console.log(`  .work/ left in place for inspection: ${workDir}`);
    }
  }

  // Summary
  console.log(`\nResults: ${passed}/${totalScenarios} passed`);

  if (failures.length > 0) {
    console.log("\nFAILURES:");
    for (const failure of failures) {
      console.log(`\n  ${failure.name}:`);
      for (const error of failure.errors) {
        console.log(`    ${error}`);
      }
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
