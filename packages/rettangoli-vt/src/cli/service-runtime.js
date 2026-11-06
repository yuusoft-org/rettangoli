import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const READY_TIMEOUT_MS = 120000;
const READY_INTERVAL_MS = 500;
const STOP_TIMEOUT_MS = 10000;
const STOP_POLL_MS = 50;
const INTERRUPT_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatExitMessage(result) {
  if (!result) return "unknown exit state";
  if (result.code !== null && result.code !== undefined) {
    return `code ${result.code}`;
  }
  if (result.signal) {
    return `signal ${result.signal}`;
  }
  return "unknown exit state";
}

function hasExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

// Linux only: whether a process of the group is still running. Zombies do not count: under a
// PID 1 that does not reap orphans (node in Docker), an exited service stays a zombie.
function hasRunningGroupMember(pgid) {
  try {
    return readdirSync("/proc").some((entry) => {
      if (!/^\d+$/.test(entry)) return false;
      try {
        const stat = readFileSync(`/proc/${entry}/stat`, "utf8");
        const [state, , group] = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
        return state !== "Z" && Number(group) === pgid;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

// The service runs through a shell. dash (/bin/sh on Debian and Ubuntu) forks the command
// instead of exec'ing it, so the service can outlive the shell: check the whole group.
function isServiceRunning(handle) {
  const { child, useProcessGroup } = handle;
  if (!hasExited(child)) return true;
  if (!useProcessGroup || !child.pid) return false;
  try {
    process.kill(-child.pid, 0);
  } catch (error) {
    return error?.code === "EPERM";
  }
  return process.platform !== "linux" || hasRunningGroupMember(child.pid);
}

function sendSignal(handle, signal) {
  const { child, useProcessGroup } = handle;
  const pid = child.pid;
  if (!pid) {
    return;
  }

  try {
    if (useProcessGroup) {
      process.kill(-pid, signal);
      return;
    }
    child.kill(signal);
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
  }
}

// Stops the service without waiting (exit handlers and signal handlers must be synchronous).
function signalService(handle, signal) {
  try {
    if (isServiceRunning(handle)) sendSignal(handle, signal);
  } catch {}
}

// Before vt.service.start runs: a server that already answers at `url` (a dev server left
// running) would pass the readiness check and be captured instead of the managed service. Warns
// and returns true when something answers within `timeoutMs`.
export async function probeExistingService(url, timeoutMs = 1000) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    return false;
  }
  response.body?.cancel().catch(() => {});
  console.warn(
    `[vt] Warning: ${url} already answers (status ${response.status}) before vt.service.start runs. VT may capture that server instead of the managed service.`,
  );
  return true;
}

export function startManagedService({ command }) {
  const useProcessGroup = process.platform !== "win32";
  const child = spawn(command, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    env: process.env,
    detached: useProcessGroup,
  });

  const exitPromise = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });

  // The service runs in its own process group, so nothing else stops it if this process
  // exits (process.exit) before stopManagedService runs.
  const handle = { child, exitPromise, useProcessGroup };
  handle.stopOnExit = () => signalService(handle, "SIGTERM");
  process.once("exit", handle.stopOnExit);

  console.log(`Starting managed service: ${command}`);
  return handle;
}

// Stops the service on Ctrl+C (SIGINT), SIGTERM or SIGHUP while VT waits for it to become ready;
// the service is in its own process group, so the terminal's signal does not reach it. Then the
// signal is raised again so the process ends as it would have (status 130 for SIGINT), unless
// another listener handles it. Returns a function that removes the handlers.
export function installInterruptCleanup(handle) {
  const dispose = () => {
    for (const signal of INTERRUPT_SIGNALS) {
      process.off(signal, onSignal);
    }
  };
  const onSignal = (signal) => {
    dispose();
    signalService(handle, "SIGTERM");
    if (process.listenerCount(signal) === 0) {
      process.kill(process.pid, signal);
    }
  };
  for (const signal of INTERRUPT_SIGNALS) {
    process.on(signal, onSignal);
  }
  return dispose;
}

export async function waitForServiceReady({
  url,
  handle,
  timeoutMs = READY_TIMEOUT_MS,
  intervalMs = READY_INTERVAL_MS,
}) {
  const deadline = Date.now() + timeoutMs;
  // exitPromise rejects when the service could not be spawned (ENOENT, EACCES...).
  const exited = handle.exitPromise.then(
    (result) => ({ exited: result }),
    (error) => ({ exited: null, error }),
  );
  const exitedError = ({ exited: result, error }) => (error
    ? new Error(`Managed service failed to start: ${error.message}`, { cause: error })
    : new Error(`Managed service exited before becoming ready (${formatExitMessage(result)}).`));

  while (Date.now() < deadline) {
    if (hasExited(handle.child)) {
      throw exitedError(await exited);
    }

    // Each request ends at the deadline at the latest, or as soon as the service exits.
    const abort = new AbortController();
    const signal = AbortSignal.any([
      abort.signal,
      AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    ]);
    const attempt = await Promise.race([
      fetch(url, { signal }).then((response) => ({ response }), () => ({})),
      exited,
    ]).finally(() => abort.abort());
    if ("exited" in attempt) {
      throw exitedError(attempt);
    }
    if (attempt.response) {
      attempt.response.body?.cancel().catch(() => {});
      console.log(`Managed service ready: ${url} (status ${attempt.response.status})`);
      return;
    }

    await Promise.race([sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now()))), exited]);
  }

  throw new Error(
    `Timed out waiting for managed service at ${url} after ${timeoutMs}ms.`,
  );
}

async function waitForServiceExit(handle, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (isServiceRunning(handle)) {
    if (Date.now() >= deadline) {
      return false;
    }
    await sleep(STOP_POLL_MS);
  }
  return true;
}

export async function stopManagedService(handle) {
  if (!handle) return;

  process.off("exit", handle.stopOnExit);
  if (!isServiceRunning(handle)) {
    return;
  }

  console.log("Stopping managed service (SIGTERM)...");
  sendSignal(handle, "SIGTERM");
  if (await waitForServiceExit(handle, STOP_TIMEOUT_MS)) {
    return;
  }

  console.warn("Managed service did not exit after SIGTERM, sending SIGKILL...");
  sendSignal(handle, "SIGKILL");
  await waitForServiceExit(handle, STOP_TIMEOUT_MS);
}
