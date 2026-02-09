import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const describeDockerE2E = process.env.VT_DOCKER_E2E === "1" ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTempProjectRoot() {
  return mkdtempSync(join(tmpdir(), "rettangoli-vt-docker-"));
}

function writeFixture(rootDir, htmlContent, vtOverrides = "") {
  const vtPath = join(rootDir, "vt");
  const specsDir = join(vtPath, "specs", "components");
  mkdirSync(specsDir, { recursive: true });

  const configYaml = `vt:
  path: ./vt
  compareMethod: md5
  sections:
    - title: components_basic
      files: components
${vtOverrides}
`;
  writeFileSync(join(rootDir, "rettangoli.config.yaml"), configYaml, "utf8");
  writeFileSync(join(specsDir, "basic.html"), htmlContent, "utf8");
}

function buildSpecHtml(label, color) {
  return `---
title: basic_component
---
<div style="width:360px;height:220px;padding:24px;background:${color};color:#fff;font:700 42px Arial;">
  ${label}
</div>
`;
}

function findMonorepoRoot() {
  let currentDir = process.cwd();
  while (currentDir !== "/") {
    if (existsSync(join(currentDir, "packages"))) {
      return currentDir;
    }
    currentDir = join(currentDir, "..");
  }
  throw new Error("Could not find monorepo root");
}

function buildDockerImage(localTag) {
  const monorepoRoot = findMonorepoRoot();
  const vtPackagePath = join(monorepoRoot, "packages", "rettangoli-vt");

  console.log(`Building Docker image with tag: ${localTag}`);
  console.log(`Monorepo root: ${monorepoRoot}`);
  console.log(`VT package path: ${vtPackagePath}`);

  // Build from monorepo root as context (Dockerfile references packages/*)
  execSync(
    `docker build -t ${localTag} -f packages/rettangoli-vt/docker/Dockerfile.test .`,
    {
      cwd: monorepoRoot,
      stdio: "inherit",
    }
  );
}

function ensureDockerImage(imageTag) {
  try {
    execSync(`docker inspect ${imageTag}`, { stdio: "ignore" });
  } catch {
    buildDockerImage(imageTag);
  }
}

function runDockerContainer(imageTag, projectRoot, command) {
  const containerName = `rtgl-test-${Date.now()}`;

  // Run the container with the project root mounted
  const dockerCmd = [
    "docker run",
    "--rm",
    `--name ${containerName}`,
    `-v "${projectRoot}:/workspace"`,
    "-w /workspace",
    imageTag,
    command,
  ].join(" ");

  console.log(`Running Docker command: ${dockerCmd}`);
  const output = execSync(dockerCmd, {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: "pipe",
  });

  return output;
}

function runDockerContainerExpectFailure(imageTag, projectRoot, command, expectedPattern) {
  let err;
  try {
    runDockerContainer(imageTag, projectRoot, command);
  } catch (e) {
    err = e;
  }
  expect(err).toBeDefined();

  const stdout = typeof err.stdout === "string" ? err.stdout : err.stdout?.toString("utf8") || "";
  const stderr = typeof err.stderr === "string" ? err.stderr : err.stderr?.toString("utf8") || "";
  const combined = [err.message || "", stdout, stderr].join("\n");

  if (expectedPattern) {
    expect(combined).toMatch(expectedPattern);
  }

  return combined;
}

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

function readJson(filePath) {
  expect(existsSync(filePath)).toBe(true);
  const raw = readFileSync(filePath, "utf8");
  expect(raw.length).toBeGreaterThan(0);
  return JSON.parse(raw);
}

function expectFileExistsAndNonEmpty(filePath) {
  expect(existsSync(filePath)).toBe(true);
  const st = statSync(filePath);
  expect(st.isFile()).toBe(true);
  expect(st.size).toBeGreaterThan(0);
}

function expectDirExists(dirPath) {
  expect(existsSync(dirPath)).toBe(true);
  expect(statSync(dirPath).isDirectory()).toBe(true);
}

function expectWebpFile(filePath) {
  expectFileExistsAndNonEmpty(filePath);
  const buf = readFileSync(filePath);
  // WebP files start with "RIFF" at offset 0 and "WEBP" at offset 8
  expect(buf.length).toBeGreaterThan(12);
  expect(buf.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(buf.subarray(8, 12).toString("ascii")).toBe("WEBP");
}

function expectHtmlContains(filePath, markers) {
  expectFileExistsAndNonEmpty(filePath);
  const html = readFileSync(filePath, "utf8");
  for (const marker of markers) {
    expect(html).toContain(marker);
  }
}

function flattenFiles(rootDir) {
  const out = [];
  function walk(current) {
    for (const name of readdirSync(current)) {
      const abs = join(current, name);
      const st = statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
      } else {
        out.push(relative(rootDir, abs).replace(/\\/g, "/"));
      }
    }
  }
  if (existsSync(rootDir)) walk(rootDir);
  return out.sort();
}

function expectDirectoryContainsAtLeast(rootDir, expectedRelativePaths) {
  const actual = new Set(flattenFiles(rootDir));
  for (const rel of expectedRelativePaths) {
    expect(actual.has(rel)).toBe(true);
  }
}

function expectIsoDateString(value) {
  expect(typeof value).toBe("string");
  expect(Number.isNaN(Date.parse(value))).toBe(false);
}

function md5File(filePath) {
  return createHash("md5").update(readFileSync(filePath)).digest("hex");
}

function validateMetricsJson(metrics, { expectedTasks, expectedSuccessful }) {
  expectIsoDateString(metrics.generatedAt);
  expect(metrics).toEqual(
    expect.objectContaining({
      summary: expect.any(Object),
      successes: expect.any(Array),
      failures: expect.any(Array),
      retries: expect.any(Array),
      recycles: expect.any(Array),
      attempts: expect.any(Array),
    })
  );

  const summary = metrics.summary;
  expect(summary.totalTasks).toBe(expectedTasks);
  expect(summary.successful).toBe(expectedSuccessful);
  expect(summary.durationMs).toBeGreaterThan(0);

  expect(summary.timings).toEqual(
    expect.objectContaining({
      totalMs: expect.any(Object),
      navigationMs: expect.any(Object),
      readyMs: expect.any(Object),
      attemptMs: expect.any(Object),
      queueWaitMs: expect.any(Object),
    })
  );

  expect(metrics.successes.length).toBe(summary.successful);
  for (const item of metrics.successes) {
    expect(item.path).toEqual(expect.any(String));
    expect(item.screenshotCount).toBeGreaterThanOrEqual(1);
    expect(item.timings.totalMs).toBeGreaterThan(0);
  }
}

function validateReportJson(report, { expectedTotal, expectedMismatched }) {
  expectIsoDateString(report.timestamp);
  expect(report.total).toBe(expectedTotal);
  expect(report.mismatched).toBe(expectedMismatched);
  expect(Array.isArray(report.items)).toBe(true);
  expect(report.items).toHaveLength(expectedMismatched);

  for (const item of report.items) {
    expect(item.path).toEqual(expect.any(String));
    expect(typeof item.equal).toBe("boolean");
    expect(typeof item.onlyInCandidate).toBe("boolean");
    expect(typeof item.onlyInReference).toBe("boolean");

    if (item.candidatePath !== null) expect(item.candidatePath).toEqual(expect.any(String));
    if (item.referencePath !== null) expect(item.referencePath).toEqual(expect.any(String));

    if (item.similarity !== undefined && item.similarity !== null) {
      const similarity = Number(item.similarity);
      expect(Number.isFinite(similarity)).toBe(true);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(100);
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeDockerE2E("VT Docker E2E", () => {
  let originalCwd;
  let tempRoot;
  const dockerImageTag = "rtgl-local-test:latest";

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    if (originalCwd) {
      process.chdir(originalCwd);
    }
    if (tempRoot && existsSync(tempRoot)) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
    originalCwd = null;
    tempRoot = null;
  });

  it("builds and runs docker image with generate command", async () => {
    // Build the Docker image
    buildDockerImage(dockerImageTag);

    // Create a test project
    tempRoot = createTempProjectRoot();
    writeFixture(tempRoot, buildSpecHtml("Docker Test", "#2c7be5"));
    process.chdir(tempRoot);

    // Run generate command in Docker
    const output = runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    const siteRoot = join(tempRoot, ".rettangoli", "vt", "_site");
    const candidateDir = join(siteRoot, "candidate");
    const metricsPath = join(tempRoot, ".rettangoli", "vt", "metrics.json");

    // Validate candidate screenshot is a valid WebP
    const candidateScreenshotPath = join(candidateDir, "components", "basic-01.webp");
    expectWebpFile(candidateScreenshotPath);

    // Validate generated HTML contains the spec content
    const generatedHtmlPath = join(candidateDir, "components", "basic.html");
    expectHtmlContains(generatedHtmlPath, ["Docker Test", "<div"]);

    // Validate section overview page
    const sectionOverviewPath = join(siteRoot, "components_basic.html");
    expectFileExistsAndNonEmpty(sectionOverviewPath);

    // Validate directory structure
    expectDirectoryContainsAtLeast(candidateDir, [
      "components/basic.html",
      "components/basic-01.webp",
    ]);

    // Validate metrics.json
    const metrics = readJson(metricsPath);
    validateMetricsJson(metrics, { expectedTasks: 1, expectedSuccessful: 1 });
  }, 300000);

  it("runs generate and report in docker container", async () => {
    ensureDockerImage(dockerImageTag);

    // Create a test project
    tempRoot = createTempProjectRoot();
    writeFixture(tempRoot, buildSpecHtml("State A", "#2c7be5"));
    process.chdir(tempRoot);

    // Run generate command in Docker
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    const siteRoot = join(tempRoot, ".rettangoli", "vt", "_site");
    const reportJsonPath = join(tempRoot, ".rettangoli", "vt", "report.json");
    const reportHtmlPath = join(siteRoot, "report.html");

    // First report should fail (no baseline) but still produce report.json
    runDockerContainerExpectFailure(
      dockerImageTag,
      tempRoot,
      "rtgl vt report",
      /Visual differences found|Error generating VT report/,
    );

    // Validate the initial report shows onlyInCandidate
    const firstReport = readJson(reportJsonPath);
    validateReportJson(firstReport, { expectedTotal: 1, expectedMismatched: 1 });
    expect(firstReport.items[0]).toEqual(
      expect.objectContaining({
        equal: false,
        onlyInCandidate: true,
        onlyInReference: false,
      })
    );

    // Accept the screenshots
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt accept");

    // Validate accept copied candidate to vt/reference
    const referencePath = join(tempRoot, "vt", "reference", "components", "basic-01.webp");
    const candidatePath = join(siteRoot, "candidate", "components", "basic-01.webp");
    expectWebpFile(referencePath);
    expect(md5File(referencePath)).toBe(md5File(candidatePath));

    // Run report again (should succeed now)
    const reportOutput = runDockerContainer(dockerImageTag, tempRoot, "rtgl vt report");

    // Validate report JSON shows zero mismatches
    const secondReport = readJson(reportJsonPath);
    validateReportJson(secondReport, { expectedTotal: 1, expectedMismatched: 0 });
    expect(secondReport.items).toEqual([]);

    // Validate reference was copied to _site/reference
    expectWebpFile(join(siteRoot, "reference", "components", "basic-01.webp"));
  }, 300000);

  it("detects visual differences correctly in docker", async () => {
    ensureDockerImage(dockerImageTag);

    // Create a test project
    tempRoot = createTempProjectRoot();
    writeFixture(tempRoot, buildSpecHtml("State A", "#2c7be5"));
    process.chdir(tempRoot);

    // Generate and accept baseline
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");
    runDockerContainerExpectFailure(
      dockerImageTag,
      tempRoot,
      "rtgl vt report",
      /Visual differences found|Error generating VT report/,
    );
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt accept");

    // Modify the spec to create a visual difference
    writeFixture(tempRoot, buildSpecHtml("State B", "#d6336c"));

    // Generate new screenshots
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    // Run report - should detect differences
    runDockerContainerExpectFailure(
      dockerImageTag,
      tempRoot,
      "rtgl vt report",
      /Visual differences found|Error generating VT report/,
    );

    // Verify report shows mismatches with correct fields
    const reportJsonPath = join(tempRoot, ".rettangoli", "vt", "report.json");
    const report = readJson(reportJsonPath);
    validateReportJson(report, { expectedTotal: 1, expectedMismatched: 1 });

    const item = report.items[0];
    expect(item.equal).toBe(false);
    expect(item.onlyInCandidate).toBe(false);
    expect(item.onlyInReference).toBe(false);

    // Validate both candidate and reference screenshots exist in _site
    const siteRoot = join(tempRoot, ".rettangoli", "vt", "_site");
    expectWebpFile(join(siteRoot, "candidate", "components", "basic-01.webp"));
    expectWebpFile(join(siteRoot, "reference", "components", "basic-01.webp"));
  }, 300000);

  it("supports waitEvent readiness in docker", async () => {
    ensureDockerImage(dockerImageTag);

    // Create a test project with waitEvent
    tempRoot = createTempProjectRoot();
    writeFixture(
      tempRoot,
      `---
title: event_ready_component
---
<script>
  setTimeout(() => {
    window.dispatchEvent(new Event("vt:ready"));
  }, 20);
</script>
<div style="width:360px;height:220px;padding:24px;background:#0b7285;color:#fff;font:700 42px Arial;">
  Event Ready
</div>
`,
      "  waitEvent: vt:ready\n",
    );
    process.chdir(tempRoot);

    // Generate with waitEvent
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    const siteRoot = join(tempRoot, ".rettangoli", "vt", "_site");

    // Validate screenshot is a valid WebP
    const screenshotPath = join(siteRoot, "candidate", "components", "basic-01.webp");
    expectWebpFile(screenshotPath);

    // Validate generated HTML contains the event-ready content
    const htmlPath = join(siteRoot, "candidate", "components", "basic.html");
    expectHtmlContains(htmlPath, ["Event Ready", "vt:ready"]);

    // Validate metrics show successful capture with event strategy
    const metricsPath = join(tempRoot, ".rettangoli", "vt", "metrics.json");
    const metrics = readJson(metricsPath);
    validateMetricsJson(metrics, { expectedTasks: 1, expectedSuccessful: 1 });
    expect(metrics.successes[0].strategy).toBe("event");
  }, 300000);

  it("generates complete structure for multi-spec multi-section fixture", async () => {
    ensureDockerImage(dockerImageTag);

    tempRoot = createTempProjectRoot();
    const vtPath = join(tempRoot, "vt");
    mkdirSync(join(vtPath, "specs", "components"), { recursive: true });
    mkdirSync(join(vtPath, "specs", "pages"), { recursive: true });

    writeFileSync(
      join(tempRoot, "rettangoli.config.yaml"),
      `vt:
  path: ./vt
  compareMethod: md5
  sections:
    - title: components_basic
      files: components
    - title: pages_basic
      files: pages
`,
      "utf8",
    );

    writeFileSync(
      join(vtPath, "specs", "components", "button.html"),
      buildSpecHtml("Button", "#0b7285"),
      "utf8",
    );
    writeFileSync(
      join(vtPath, "specs", "components", "card.html"),
      buildSpecHtml("Card", "#2f9e44"),
      "utf8",
    );
    writeFileSync(
      join(vtPath, "specs", "pages", "home.html"),
      buildSpecHtml("Home", "#f08c00"),
      "utf8",
    );

    process.chdir(tempRoot);
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    const siteRoot = join(tempRoot, ".rettangoli", "vt", "_site");
    const candidateDir = join(siteRoot, "candidate");

    // Validate all candidate files
    expectDirectoryContainsAtLeast(candidateDir, [
      "components/button.html",
      "components/button-01.webp",
      "components/card.html",
      "components/card-01.webp",
      "pages/home.html",
      "pages/home-01.webp",
    ]);

    // Validate each screenshot is valid WebP
    expectWebpFile(join(candidateDir, "components", "button-01.webp"));
    expectWebpFile(join(candidateDir, "components", "card-01.webp"));
    expectWebpFile(join(candidateDir, "pages", "home-01.webp"));

    // Validate section overview pages exist
    expectFileExistsAndNonEmpty(join(siteRoot, "components_basic.html"));
    expectFileExistsAndNonEmpty(join(siteRoot, "pages_basic.html"));

    // Validate metrics
    const metrics = readJson(join(tempRoot, ".rettangoli", "vt", "metrics.json"));
    validateMetricsJson(metrics, { expectedTasks: 3, expectedSuccessful: 3 });
  }, 300000);

  it("validates detailed report fields across full baseline/update flow (pixelmatch)", async () => {
    ensureDockerImage(dockerImageTag);

    tempRoot = createTempProjectRoot();
    const vtPath = join(tempRoot, "vt");
    mkdirSync(join(vtPath, "specs", "components"), { recursive: true });
    writeFileSync(
      join(tempRoot, "rettangoli.config.yaml"),
      `vt:
  path: ./vt
  compareMethod: pixelmatch
  colorThreshold: 0.1
  diffThreshold: 0.3
  sections:
    - title: components_basic
      files: components
`,
      "utf8",
    );
    writeFileSync(
      join(vtPath, "specs", "components", "basic.html"),
      buildSpecHtml("State A", "#2c7be5"),
      "utf8",
    );
    process.chdir(tempRoot);

    // Generate initial screenshots
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    // Initial report fails (no baseline) and should mark onlyInCandidate
    runDockerContainerExpectFailure(
      dockerImageTag,
      tempRoot,
      "rtgl vt report",
      /Visual differences found|Error generating VT report/,
    );
    const reportJsonPath = join(tempRoot, ".rettangoli", "vt", "report.json");
    const initialReport = readJson(reportJsonPath);
    validateReportJson(initialReport, { expectedTotal: 1, expectedMismatched: 1 });
    expect(initialReport.items[0]).toEqual(
      expect.objectContaining({
        equal: false,
        onlyInCandidate: true,
        onlyInReference: false,
      })
    );

    // Accept baseline
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt accept");

    // Validate accept copied files correctly
    const siteRoot = join(tempRoot, ".rettangoli", "vt", "_site");
    const baselineRef = join(tempRoot, "vt", "reference", "components", "basic-01.webp");
    const baselineCandidate = join(siteRoot, "candidate", "components", "basic-01.webp");
    expectWebpFile(baselineRef);
    expect(md5File(baselineRef)).toBe(md5File(baselineCandidate));

    // Modify spec to force visual diff
    writeFileSync(
      join(vtPath, "specs", "components", "basic.html"),
      buildSpecHtml("State B", "#d6336c"),
      "utf8",
    );
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    // Report should fail with visual differences
    runDockerContainerExpectFailure(
      dockerImageTag,
      tempRoot,
      "rtgl vt report",
      /Visual differences found|Error generating VT report/,
    );

    const report = readJson(reportJsonPath);
    validateReportJson(report, { expectedTotal: 1, expectedMismatched: 1 });

    const item = report.items[0];
    expect(item.equal).toBe(false);
    expect(item.onlyInCandidate).toBe(false);
    expect(item.onlyInReference).toBe(false);

    // pixelmatch mode should provide similarity
    expect(typeof item.similarity).toBe("string");
    const similarity = Number(item.similarity);
    expect(Number.isFinite(similarity)).toBe(true);
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThan(100);

    // Validate diff image was produced
    const diffDir = join(siteRoot, "diff");
    if (existsSync(diffDir)) {
      const diffFiles = flattenFiles(diffDir);
      expect(diffFiles.length).toBeGreaterThan(0);
    }

    // Validate report HTML was generated
    expectFileExistsAndNonEmpty(join(siteRoot, "report.html"));
  }, 300000);

  it("captures multi-screenshot specs with ordered suffixes", async () => {
    ensureDockerImage(dockerImageTag);

    tempRoot = createTempProjectRoot();
    const vtPath = join(tempRoot, "vt");
    mkdirSync(join(vtPath, "specs", "components"), { recursive: true });
    writeFileSync(
      join(tempRoot, "rettangoli.config.yaml"),
      `vt:
  path: ./vt
  compareMethod: md5
  sections:
    - title: components_basic
      files: components
`,
      "utf8",
    );

    // A spec with a "screenshot" step produces -01 (initial) + -02 (from step)
    writeFileSync(
      join(vtPath, "specs", "components", "flow.html"),
      `---
title: multi_capture
steps:
  - screenshot
---
<div style="width:360px;height:220px;padding:24px;background:#5f3dc4;color:#fff;font:700 42px Arial;">
  Multi Capture
</div>
`,
      "utf8",
    );

    process.chdir(tempRoot);
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt generate");

    const candidateDir = join(tempRoot, ".rettangoli", "vt", "_site", "candidate");

    // Validate both screenshots exist and are valid WebP
    expectWebpFile(join(candidateDir, "components", "flow-01.webp"));
    expectWebpFile(join(candidateDir, "components", "flow-02.webp"));

    // Validate directory listing
    const files = flattenFiles(candidateDir);
    expect(files).toContain("components/flow-01.webp");
    expect(files).toContain("components/flow-02.webp");

    // Validate metrics show correct screenshot count
    const metrics = readJson(join(tempRoot, ".rettangoli", "vt", "metrics.json"));
    validateMetricsJson(metrics, { expectedTasks: 1, expectedSuccessful: 1 });
    expect(metrics.successes[0].screenshotCount).toBe(2);

    // Report without baseline: should list both images as mismatched
    runDockerContainerExpectFailure(
      dockerImageTag,
      tempRoot,
      "rtgl vt report",
      /Visual differences found|Error generating VT report/,
    );
    const report = readJson(join(tempRoot, ".rettangoli", "vt", "report.json"));
    validateReportJson(report, { expectedTotal: 2, expectedMismatched: 2 });

    // Accept and verify clean report
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt accept");
    runDockerContainer(dockerImageTag, tempRoot, "rtgl vt report");

    const cleanReport = readJson(join(tempRoot, ".rettangoli", "vt", "report.json"));
    validateReportJson(cleanReport, { expectedTotal: 2, expectedMismatched: 0 });
  }, 300000);
});
