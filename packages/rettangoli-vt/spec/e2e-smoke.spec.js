import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import generate from "../src/cli/generate.js";
import report from "../src/cli/report.js";
import accept from "../src/cli/accept.js";

const describeE2E = process.env.VT_E2E === "1" ? describe : describe.skip;

function createTempProjectRoot() {
  return mkdtempSync(join(tmpdir(), "rettangoli-vt-e2e-"));
}

function writeFixture(rootDir, htmlContent) {
  const vtPath = join(rootDir, "vt");
  const specsDir = join(vtPath, "specs", "components");
  mkdirSync(specsDir, { recursive: true });

  const configYaml = `vt:
  path: ./vt
  compareMethod: md5
  sections:
    - title: components_basic
      files: components
  capture:
    workerCount: 1
    waitStrategy: load
    screenshotWaitTime: 0
    maxRetries: 0
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

async function getAvailablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => {
          reject(new Error("Unable to determine ephemeral port."));
        });
        return;
      }
      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(port);
      });
    });
  });
}

describeE2E("VT E2E smoke", () => {
  let originalCwd;
  let tempRoot;

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

  it("runs generate, accept, and report with real screenshots", async () => {
    originalCwd = process.cwd();
    tempRoot = createTempProjectRoot();
    process.chdir(tempRoot);

    writeFixture(tempRoot, buildSpecHtml("State A", "#2c7be5"));
    const firstPort = await getAvailablePort();

    await generate({
      vtPath: "./vt",
      workers: 1,
      port: firstPort,
      waitStrategy: "load",
      screenshotWaitTime: 0,
    });

    const candidateScreenshotPath = join(
      tempRoot,
      ".rettangoli",
      "vt",
      "_site",
      "candidate",
      "components",
      "basic-01.webp",
    );
    expect(existsSync(candidateScreenshotPath)).toBe(true);

    await expect(
      report({ vtPath: "./vt", compareMethod: "md5" }),
    ).rejects.toThrow("Visual differences found");

    await accept({ vtPath: "./vt" });
    await expect(
      report({ vtPath: "./vt", compareMethod: "md5" }),
    ).resolves.toBeUndefined();

    writeFixture(tempRoot, buildSpecHtml("State B", "#d6336c"));
    const secondPort = await getAvailablePort();
    await generate({
      vtPath: "./vt",
      workers: 1,
      port: secondPort,
      waitStrategy: "load",
      screenshotWaitTime: 0,
    });

    await expect(
      report({ vtPath: "./vt", compareMethod: "md5" }),
    ).rejects.toThrow("Visual differences found");
  }, 180000);
});
