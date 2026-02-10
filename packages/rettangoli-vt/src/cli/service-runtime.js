import { spawn } from "node:child_process";

const READY_TIMEOUT_MS = 120000;
const READY_INTERVAL_MS = 500;
const STOP_TIMEOUT_MS = 10000;

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

  console.log(`Starting managed service: ${command}`);
  return { child, exitPromise, useProcessGroup };
}

export async function waitForServiceReady({ url, handle }) {
  const startMs = Date.now();

  while (Date.now() - startMs < READY_TIMEOUT_MS) {
    if (handle.child.exitCode !== null) {
      const result = await handle.exitPromise.catch(() => null);
      throw new Error(
        `Managed service exited before becoming ready (${formatExitMessage(result)}).`,
      );
    }

    try {
      const response = await fetch(url);
      console.log(`Managed service ready: ${url} (status ${response.status})`);
      return;
    } catch {
      // Keep polling until timeout.
    }

    await sleep(READY_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for managed service at ${url} after ${READY_TIMEOUT_MS}ms.`,
  );
}

export async function stopManagedService(handle) {
  if (!handle) return;

  const { child, exitPromise } = handle;
  if (child.exitCode !== null) {
    return;
  }

  console.log("Stopping managed service (SIGTERM)...");
  sendSignal(handle, "SIGTERM");

  const exitedGracefully = await Promise.race([
    exitPromise.then(() => true).catch(() => true),
    sleep(STOP_TIMEOUT_MS).then(() => false),
  ]);

  if (exitedGracefully) {
    return;
  }

  if (child.exitCode === null) {
    console.warn("Managed service did not exit after SIGTERM, sending SIGKILL...");
    sendSignal(handle, "SIGKILL");
  }

  await exitPromise.catch(() => null);
}
