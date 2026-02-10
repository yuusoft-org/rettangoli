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

function writeManagedServiceFixture(rootDir, servicePort) {
  const vtPath = join(rootDir, "vt");
  const specsDir = join(vtPath, "specs", "components");
  mkdirSync(specsDir, { recursive: true });

  const configYaml = `vt:
  path: ./vt
  url: http://127.0.0.1:${servicePort}
  service:
    start: node managed-preview.js ${servicePort}
  compareMethod: md5
  sections:
    - title: components_basic
      files: components
`;

  const managedServerScript = `const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const port = Number(process.argv[2]);
const rootDir = process.cwd();
const stoppedMarker = path.join(rootDir, ".service-stopped");

const pages = {
  "/": "<!doctype html><html><body>root</body></html>",
  "/about": "<!doctype html><html><body><div style='width:360px;height:220px;padding:24px;background:#198754;color:#fff;font:700 42px Arial;'>Managed Service About</div></body></html>",
};

const server = http.createServer((req, res) => {
  const html = pages[req.url] || null;
  if (!html) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
});

function shutdown() {
  server.close(() => {
    fs.writeFileSync(stoppedMarker, "stopped\\n", "utf8");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(port, "127.0.0.1");
`;

  const specHtml = `---
title: managed_service_relative_url
url: /about
---
`;

  writeFileSync(join(rootDir, "rettangoli.config.yaml"), configYaml, "utf8");
  writeFileSync(join(rootDir, "managed-preview.js"), managedServerScript, "utf8");
  writeFileSync(join(specsDir, "basic.html"), specHtml, "utf8");
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

async function getAvailablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
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
      port: firstPort,
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
      port: secondPort,
    });

    await expect(
      report({ vtPath: "./vt", compareMethod: "md5" }),
    ).rejects.toThrow("Visual differences found");
  }, 180000);

  it("supports waitEvent readiness with real browser screenshots", async () => {
    originalCwd = process.cwd();
    tempRoot = createTempProjectRoot();
    process.chdir(tempRoot);

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

    const port = await getAvailablePort();
    await generate({
      vtPath: "./vt",
      port,
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
  }, 180000);

  it("supports managed service lifecycle with vt.service.start and vt.url", async () => {
    originalCwd = process.cwd();
    tempRoot = createTempProjectRoot();
    process.chdir(tempRoot);

    const servicePort = await getAvailablePort();
    writeManagedServiceFixture(tempRoot, servicePort);

    // Use a different free port for VT internal server slot; managed service mode should not use it.
    const unusedCapturePort = await getAvailablePort();
    await generate({
      vtPath: "./vt",
      port: unusedCapturePort,
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

    // Managed service should be shut down by VT after capture.
    const stoppedMarkerPath = join(tempRoot, ".service-stopped");
    expect(existsSync(stoppedMarkerPath)).toBe(true);
  }, 180000);
});
