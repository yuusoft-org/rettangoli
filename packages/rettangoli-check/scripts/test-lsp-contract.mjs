#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, "..");
const cliBinPath = path.resolve(packageRoot, "src/cli/bin.js");

const createLspClient = ({ childProcess }) => {
  let buffer = Buffer.alloc(0);
  let requestId = 0;
  const pending = new Map();
  const notificationListeners = [];

  const send = (payload) => {
    const json = JSON.stringify(payload);
    const contentLength = Buffer.byteLength(json, "utf8");
    childProcess.stdin.write(`Content-Length: ${contentLength}\r\n\r\n${json}`);
  };

  const onNotification = (method, matcher, timeoutMs = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for notification '${method}'.`));
      }, timeoutMs);

      notificationListeners.push({
        method,
        matcher,
        resolve: (payload) => {
          clearTimeout(timer);
          resolve(payload);
        },
      });
    });
  };

  const request = (method, params = {}, timeoutMs = 5000) => {
    requestId += 1;
    const id = requestId;
    send({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for response '${method}'.`));
      }, timeoutMs);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
  };

  const notify = (method, params = {}) => {
    send({
      jsonrpc: "2.0",
      method,
      params,
    });
  };

  const dispatchNotification = (message) => {
    if (!message?.method) {
      return;
    }
    for (let index = 0; index < notificationListeners.length; index += 1) {
      const listener = notificationListeners[index];
      if (listener.method !== message.method) {
        continue;
      }
      if (typeof listener.matcher === "function" && !listener.matcher(message.params || {})) {
        continue;
      }
      notificationListeners.splice(index, 1);
      listener.resolve(message.params || {});
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
      const lengthLine = headers
        .split("\r\n")
        .find((line) => line.toLowerCase().startsWith("content-length:"));
      const contentLength = Number.parseInt((lengthLine || "").split(":")[1] || "", 10);
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
        const receiver = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          receiver.reject(new Error(message.error.message || "Unknown LSP error"));
        } else {
          receiver.resolve(message.result);
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
    onNotification,
  };
};

const createWorkspace = () => {
  const root = mkdtempSync(path.join(tmpdir(), "rtgl-lsp-contract-"));
  const componentDir = path.join(root, "src/components/card");
  mkdirSync(componentDir, { recursive: true });

  writeFileSync(path.join(componentDir, "card.schema.yaml"), "componentName: rtgl-lsp-card\n", "utf8");
  writeFileSync(
    path.join(componentDir, "card.handlers.js"),
    "export const handleClick = (deps) => deps;\n",
    "utf8",
  );
  const viewText = [
    "template:",
    "  - rtgl-button @click=${handleClick}: null",
    "  - rtgl-input .value=${title}: null",
    "styles: {}",
    "",
  ].join("\n");
  writeFileSync(path.join(componentDir, "card.view.yaml"), viewText, "utf8");

  return {
    root,
    viewText,
    handlersText: readFileSync(path.join(componentDir, "card.handlers.js"), "utf8"),
    viewPath: path.join(componentDir, "card.view.yaml"),
    handlersPath: path.join(componentDir, "card.handlers.js"),
  };
};

const findPosition = ({ text, token }) => {
  const offset = text.indexOf(token);
  assert.ok(offset >= 0, `token '${token}' not found`);
  const prefix = text.slice(0, offset);
  const lines = prefix.split("\n");
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length + 1;
  return { line, character };
};

const waitForExit = (childProcess, timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for lsp process exit.")), timeoutMs);
    childProcess.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
};

const main = async () => {
  const workspace = createWorkspace();
  const viewUri = pathToFileURL(workspace.viewPath).href;
  const handlersUri = pathToFileURL(workspace.handlersPath).href;

  const child = spawn(process.execPath, [cliBinPath, "lsp", "--stdio", "--dir", "./src/components"], {
    cwd: workspace.root,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stderr.on("data", () => {});

  const client = createLspClient({ childProcess: child });

  const initialize = await client.request("initialize", {
    processId: process.pid,
    rootUri: pathToFileURL(workspace.root).href,
    capabilities: {},
  });
  assert.equal(initialize.serverInfo?.name, "@rettangoli/check-lsp");
  assert.equal(initialize.capabilities?.hoverProvider, true);
  assert.equal(initialize.capabilities?.definitionProvider, true);
  assert.equal(initialize.capabilities?.referencesProvider, true);
  assert.equal(initialize.capabilities?.renameProvider, true);
  assert.equal(initialize.capabilities?.codeActionProvider, true);

  client.notify("initialized", {});
  const publishPromise = client.onNotification(
    "textDocument/publishDiagnostics",
    (params) => params.uri === viewUri && Array.isArray(params.diagnostics),
  );
  client.notify("textDocument/didOpen", {
    textDocument: {
      uri: viewUri,
      languageId: "yaml",
      version: 1,
      text: workspace.viewText,
    },
  });
  client.notify("textDocument/didOpen", {
    textDocument: {
      uri: handlersUri,
      languageId: "javascript",
      version: 1,
      text: workspace.handlersText,
    },
  });

  const publish = await publishPromise;
  assert.ok(Array.isArray(publish.diagnostics), "expected diagnostics array in publish notification");

  const symbolPosition = findPosition({ text: workspace.viewText, token: "handleClick" });
  const hover = await client.request("textDocument/hover", {
    textDocument: { uri: viewUri },
    position: symbolPosition,
  });
  assert.ok(String(hover?.contents?.value || "").includes("handleClick"), "expected hover symbol summary");

  const definition = await client.request("textDocument/definition", {
    textDocument: { uri: viewUri },
    position: symbolPosition,
  });
  assert.ok(definition?.uri?.endsWith("card.handlers.js"), "expected definition in handlers file");

  const references = await client.request("textDocument/references", {
    textDocument: { uri: viewUri },
    position: symbolPosition,
    context: { includeDeclaration: true },
  });
  assert.ok(Array.isArray(references) && references.length >= 2, "expected cross-file references");

  const rename = await client.request("textDocument/rename", {
    textDocument: { uri: viewUri },
    position: symbolPosition,
    newName: "handleTap",
  });
  assert.ok(rename?.changes, "expected workspace edit from rename");
  const renameChangeCount = Object.values(rename.changes).reduce((total, edits) => total + edits.length, 0);
  assert.ok(renameChangeCount >= 2, "expected rename edits across files");

  const codeActions = await client.request("textDocument/codeAction", {
    textDocument: { uri: viewUri },
    range: {
      start: { line: 2, character: 0 },
      end: { line: 2, character: 60 },
    },
    context: {
      diagnostics: publish.diagnostics,
    },
  });
  assert.ok(Array.isArray(codeActions) && codeActions.length > 0, "expected code actions for safe autofix diagnostics");

  await client.request("shutdown", {});
  client.notify("exit", {});
  const exitCode = await waitForExit(child);
  assert.equal(exitCode, 0, "expected LSP process to exit cleanly");

  rmSync(workspace.root, { recursive: true, force: true });
  console.log("LSP contract pass (initialize + diagnostics push + hover/def/ref/rename/codeAction).");
};

await main();
