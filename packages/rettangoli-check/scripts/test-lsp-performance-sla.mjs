#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const cliBinPath = path.resolve(packageRoot, "src/cli/bin.js");

const DEFAULT_THRESHOLD_MS = 1500;
const SAMPLE_COUNT = 4;

const createLspClient = ({ childProcess }) => {
  let buffer = Buffer.alloc(0);
  let requestId = 0;
  const pending = new Map();
  const notifications = [];

  const send = (payload) => {
    const json = JSON.stringify(payload);
    childProcess.stdin.write(`Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`);
  };

  const request = (method, params = {}, timeoutMs = 6000) => {
    requestId += 1;
    const id = requestId;
    send({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out request '${method}'.`));
      }, timeoutMs);
      pending.set(id, {
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  };

  const notify = (method, params = {}) => {
    send({ jsonrpc: "2.0", method, params });
  };

  const waitNotification = (method, matcher, timeoutMs = 6000) => {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setTimeout(() => {
        reject(new Error(`Timed out notification '${method}'.`));
      }, timeoutMs);
      notifications.push({
        method,
        matcher,
        resolve: (params) => {
          clearTimeout(timer);
          resolve({
            params,
            elapsedMs: Date.now() - started,
          });
        },
      });
    });
  };

  const dispatchNotification = (message) => {
    for (let index = 0; index < notifications.length; index += 1) {
      const waiter = notifications[index];
      if (waiter.method !== message.method) {
        continue;
      }
      if (typeof waiter.matcher === "function" && !waiter.matcher(message.params || {})) {
        continue;
      }
      notifications.splice(index, 1);
      waiter.resolve(message.params || {});
      return;
    }
  };

  const processBuffer = () => {
    while (true) {
      const separator = buffer.indexOf("\r\n\r\n");
      if (separator < 0) {
        return;
      }
      const headers = buffer.subarray(0, separator).toString("utf8");
      const line = headers.split("\r\n").find((entry) => entry.toLowerCase().startsWith("content-length:"));
      const contentLength = Number.parseInt((line || "").split(":")[1] || "", 10);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        buffer = buffer.subarray(separator + 4);
        continue;
      }
      const bodyStart = separator + 4;
      const bodyEnd = bodyStart + contentLength;
      if (buffer.length < bodyEnd) {
        return;
      }
      const body = buffer.subarray(bodyStart, bodyEnd).toString("utf8");
      buffer = buffer.subarray(bodyEnd);
      const message = JSON.parse(body);
      if (Object.prototype.hasOwnProperty.call(message, "id") && pending.has(message.id)) {
        const handler = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          handler.reject(new Error(message.error.message || "LSP response error"));
        } else {
          handler.resolve(message.result);
        }
      } else if (message.method) {
        dispatchNotification(message);
      }
    }
  };

  childProcess.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
    processBuffer();
  });

  return {
    request,
    notify,
    waitNotification,
  };
};

const main = async () => {
  const workspace = mkdtempSync(path.join(tmpdir(), "rtgl-lsp-sla-"));
  const componentDir = path.join(workspace, "src/components/card");
  mkdirSync(componentDir, { recursive: true });
  const schemaPath = path.join(componentDir, "card.schema.yaml");
  const viewPath = path.join(componentDir, "card.view.yaml");

  writeFileSync(schemaPath, "componentName: rtgl-lsp-sla-card\n", "utf8");
  const baseView = [
    "template:",
    "  - rtgl-input .value=${title}: null",
    "styles: {}",
    "",
  ].join("\n");
  writeFileSync(viewPath, baseView, "utf8");

  const child = spawn(process.execPath, [cliBinPath, "lsp", "--stdio", "--dir", "./src/components"], {
    cwd: workspace,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stderr.on("data", () => {});
  const client = createLspClient({ childProcess: child });
  const viewUri = pathToFileURL(viewPath).href;

  await client.request("initialize", {
    processId: process.pid,
    rootUri: pathToFileURL(workspace).href,
    capabilities: {},
  });
  client.notify("initialized", {});
  client.notify("textDocument/didOpen", {
    textDocument: {
      uri: viewUri,
      languageId: "yaml",
      version: 1,
      text: baseView,
    },
  });

  await client.waitNotification(
    "textDocument/publishDiagnostics",
    (params) => params.uri === viewUri,
    8000,
  );

  const samples = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const nextText = [
      "template:",
      `  - rtgl-input .value=\${title${index}}: null`,
      "styles: {}",
      "",
    ].join("\n");
    const waiting = client.waitNotification(
      "textDocument/publishDiagnostics",
      (params) => params.uri === viewUri,
      8000,
    );
    client.notify("textDocument/didChange", {
      textDocument: {
        uri: viewUri,
        version: index + 2,
      },
      contentChanges: [{ text: nextText }],
    });
    const observed = await waiting;
    samples.push(observed.elapsedMs);
  }

  const average = samples.reduce((total, value) => total + value, 0) / samples.length;
  const sorted = [...samples].sort((left, right) => left - right);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const threshold = Number.parseInt(process.env.RTGL_LSP_SLA_THRESHOLD_MS || "", 10) || DEFAULT_THRESHOLD_MS;

  await client.request("shutdown", {});
  client.notify("exit", {});

  assert.ok(average <= threshold, `expected LSP diagnostics average ${average.toFixed(2)}ms <= ${threshold}ms`);
  assert.ok(p95 <= threshold, `expected LSP diagnostics p95 ${p95.toFixed(2)}ms <= ${threshold}ms`);

  rmSync(workspace, { recursive: true, force: true });
  console.log(`LSP performance SLA pass (avg=${average.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, threshold=${threshold}ms).`);
};

await main();
