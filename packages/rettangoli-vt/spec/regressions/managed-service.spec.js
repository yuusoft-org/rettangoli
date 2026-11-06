import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installInterruptCleanup,
  startManagedService,
  stopManagedService,
  waitForServiceReady,
} from "../../src/cli/service-runtime.js";
import { availablePort, createTempProject, writeProjectFile } from "../support/temp-project.js";

// The managed service (vt.service.start) lifecycle.
// - A service killed by a signal was not noticed, so readiness polled for 120 s.
// - A readiness request that never got an answer had no timeout.
// - Ctrl+C or process.exit() while waiting for readiness left the service running (it runs in
//   its own process group, so the terminal's SIGINT does not reach it).
// - On Linux, where /bin/sh is dash, stop resolved when the shell exited, before the service.

const fixtureDir = fileURLToPath(new URL("../fixtures/service/", import.meta.url));
const slowServer = `${fixtureDir}slow-server.mjs`;

// Accepts connections and never answers.
async function startHungServer() {
  const sockets = new Set();
  const server = net.createServer((socket) => sockets.add(socket));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close() {
      sockets.forEach((socket) => socket.destroy());
      server.close();
    },
  };
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function waitFor(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${label}.`);
}

async function rejectsWithin(promise, ms) {
  const started = Date.now();
  const error = await promise.then(() => null, (caught) => caught);
  expect(Date.now() - started).toBeLessThan(ms);
  return error;
}

describe("managed service readiness and stop", () => {
  const handles = [];
  const start = (command) => {
    const handle = startManagedService({ command });
    handles.push(handle);
    return handle;
  };

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const handle of handles.splice(0)) {
      await stopManagedService(handle);
    }
    vi.restoreAllMocks();
  });

  it("reports a service killed by a signal at once", async () => {
    const handle = start("kill -KILL $$");
    const error = await rejectsWithin(
      waitForServiceReady({ url: `http://127.0.0.1:${await availablePort()}`, handle }),
      2000,
    );
    expect(error?.message).toBe("Managed service exited before becoming ready (signal SIGKILL).");
  }, 5000);

  it("does not let a hung readiness request run past the deadline", async () => {
    const hung = await startHungServer();
    try {
      const handle = start("sleep 30");
      const error = await rejectsWithin(
        waitForServiceReady({ url: hung.url, handle, timeoutMs: 500, intervalMs: 50 }),
        1500,
      );
      expect(error?.message).toBe(`Timed out waiting for managed service at ${hung.url} after 500ms.`);
    } finally {
      hung.close();
    }
  }, 5000);

  it("reports a service that exits during a pending readiness request", async () => {
    const hung = await startHungServer();
    try {
      const handle = start("sleep 0.2; exit 3");
      const error = await rejectsWithin(waitForServiceReady({ url: hung.url, handle }), 1500);
      expect(error?.message).toBe("Managed service exited before becoming ready (code 3).");
    } finally {
      hung.close();
    }
  }, 5000);

  it("treats any response as ready", async () => {
    const server = net.createServer((socket) => {
      socket.end("HTTP/1.1 404 Not Found\r\ncontent-length: 9\r\nconnection: close\r\n\r\nnot found");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const handle = start("sleep 30");
      await waitForServiceReady({ url: `http://127.0.0.1:${server.address().port}`, handle });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("(status 404)"));
    } finally {
      server.close();
    }
  });

  it("waits for every process of the service, not only the shell", async () => {
    // `node ...; true` makes every shell fork node (dash does that even for a single command).
    const project = createTempProject({ prefix: "rettangoli-vt-managed-service-" });
    try {
      const pidFile = `${project.root}/service.pid`;
      const stoppedMarker = `${project.root}/service.stopped`;
      const handle = start(`node "${slowServer}" "${pidFile}" "${stoppedMarker}"; true`);
      await waitFor(() => existsSync(pidFile), 5000, "the service pid file");

      await stopManagedService(handle);
      expect(existsSync(stoppedMarker)).toBe(true);
      const servicePid = Number(readFileSync(pidFile, "utf8"));
      await waitFor(() => !isAlive(servicePid), 2000, "the service to be reaped");
    } finally {
      project.cleanup();
    }
  }, 15000);

  it("stops the service when the process exits, until stopManagedService runs", async () => {
    const before = process.listenerCount("exit");
    const handle = start("sleep 30");
    expect(process.listenerCount("exit")).toBe(before + 1);
    await stopManagedService(handle);
    expect(process.listenerCount("exit")).toBe(before);
  });

  it("stops the service on SIGINT and leaves the signal to other listeners", async () => {
    const project = createTempProject({ prefix: "rettangoli-vt-managed-service-" });
    const otherListener = vi.fn();
    process.on("SIGINT", otherListener);
    try {
      const pidFile = `${project.root}/service.pid`;
      const handle = start(`node "${slowServer}" "${pidFile}"`);
      const counts = () => ["SIGINT", "SIGTERM", "SIGHUP"].map((signal) => process.listenerCount(signal));
      const before = counts();
      const dispose = installInterruptCleanup(handle);
      expect(counts()).toEqual(before.map((count) => count + 1));
      await waitFor(() => existsSync(pidFile), 5000, "the service pid file");

      // Another listener exists, so the cleanup must not re-raise (which would kill this worker).
      process.emit("SIGINT", "SIGINT");
      expect(counts()).toEqual(before);
      await handle.exitPromise;
      await waitFor(() => !isAlive(Number(readFileSync(pidFile, "utf8"))), 3000, "the service to exit");
      dispose();
      expect(counts()).toEqual(before);
    } finally {
      process.off("SIGINT", otherListener);
      project.cleanup();
    }
  }, 10000);
});

describe("interrupting generate while it waits for the managed service", () => {
  let project;
  let child;

  afterEach(() => {
    // On failure, do not leave the service (or the fixture) running.
    const pidFile = project && `${project.root}/service.pid`;
    if (pidFile && existsSync(pidFile)) {
      try {
        process.kill(Number(readFileSync(pidFile, "utf8")), "SIGKILL");
      } catch {}
    }
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
    project?.cleanup();
    project = null;
    child = null;
  });

  async function startGenerate(fixture) {
    project = createTempProject({ prefix: "rettangoli-vt-managed-service-" });
    const pidFile = `${project.root}/service.pid`;
    writeProjectFile(project.root, "rettangoli.config.yaml", `vt:
  path: ./vt
  url: http://127.0.0.1:${await availablePort()}
  service:
    start: node "${slowServer}" "${pidFile}"
  sections:
    - title: pages
      files: pages
`);
    writeProjectFile(project.root, "vt/templates/default.html", "{{ content }}\n");
    writeProjectFile(project.root, "vt/specs/pages/home.html", "---\ntitle: home\n---\n<p>home</p>\n");

    // Its own process group, like a foreground job in a terminal.
    child = spawn(process.execPath, [`${fixtureDir}${fixture}`, project.root], {
      detached: true,
      stdio: "ignore",
    });
    const exited = new Promise((resolve) => {
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    await waitFor(() => existsSync(pidFile), 10000, "the service pid file");
    const servicePid = Number(readFileSync(pidFile, "utf8"));
    expect(isAlive(servicePid)).toBe(true);
    return { exited, servicePid };
  }

  it("process.exit() during readiness stops the service", async () => {
    const { exited, servicePid } = await startGenerate("exit-during-readiness.mjs");
    expect(await exited).toEqual({ code: 0, signal: null });
    await waitFor(() => !isAlive(servicePid), 3000, "the orphaned service to exit");
  }, 20000);

  it("Ctrl+C during readiness stops the service and still ends the process by SIGINT", async () => {
    const { exited, servicePid } = await startGenerate("sigint-during-readiness.mjs");
    process.kill(-child.pid, "SIGINT");
    // Shell exit status 130.
    expect(await exited).toEqual({ code: null, signal: "SIGINT" });
    await waitFor(() => !isAlive(servicePid), 3000, "the orphaned service to exit");
  }, 20000);
});
