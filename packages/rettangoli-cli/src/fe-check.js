import { relative, resolve, sep, isAbsolute } from "node:path";

// `rtgl fe build` and `rtgl fe watch` list at most this many diagnostics. The
// summary lines count all of them, and `rtgl check` prints the full report.
export const MAX_LISTED_DIAGNOSTICS = 10;

// Watch waits for this long after the last file event before it checks again.
export const WATCH_DEBOUNCE_MS = 200;

function firstLine(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n")[0].trim() || "unknown error";
}

function isInside(parent, candidate) {
  const relativePath = relative(parent, candidate);
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
  );
}

// Prints what `rtgl check` reports for the directories of an fe build, without
// changing the result of the build: nothing here throws or sets an exit code.
//
//   run()           checks now and prints the report if it differs from the
//                   last one printed. A project without diagnostics prints
//                   nothing, unless diagnostics were printed before. A call
//                   during a run queues one more run instead of overlapping.
//   watch(watcher)  calls run() after files in `dirs` change (debounced).
//
// `load` imports a @rettangoli/* entry point, `write` prints one block of
// lines (without a trailing newline).
export function createFeCheckReporter({
  load,
  cwd,
  dirs,
  // console.log, like the build's own lines: it ignores a closed pipe
  // (`rtgl fe build | head -2`). process.stdout.write would report EPIPE as an
  // unhandled 'error' event and turn a successful build into exit code 1.
  write = (text) => console.log(text),
  debounceMs = WATCH_DEBOUNCE_MS,
}) {
  let runCheck = null;
  // Identifies the last report printed. "" means none, or a clean one.
  let printedKey = "";
  let running = null;
  let queued = false;

  async function describe() {
    try {
      if (!runCheck) {
        const { createChecker } = await load("@rettangoli/check/cli");
        runCheck = createChecker({ cwd, dirs, maxDiagnostics: MAX_LISTED_DIAGNOSTICS });
      }
      const { result, report } = await runCheck();
      const { error, warn } = result.summary.bySeverity;
      if (error + warn === 0) {
        return { key: "", text: report };
      }
      return {
        // Line numbers and the order are left out, so diagnostics that only
        // moved within their file are not printed again. Duplicates are kept:
        // one more of the same diagnostic is a change.
        key: JSON.stringify(
          result.diagnostics
            .map((diagnostic) =>
              JSON.stringify([
                diagnostic.code,
                diagnostic.severity,
                diagnostic.message,
                diagnostic.filePath,
              ]),
            )
            .sort(),
        ),
        text:
          `${report}\n` +
          `[Check] ${error} error(s), ${warn} warning(s). These do not fail the build. ` +
          "Run `rtgl check` for the full report and to fail CI on them.",
      };
    } catch (error) {
      const text = `[Check] Could not run the contract check: ${firstLine(error)}`;
      return { key: text, text };
    }
  }

  async function runOnce() {
    const { key, text } = await describe();
    if (key === printedKey) {
      return;
    }
    printedKey = key;
    write(text);
  }

  function run() {
    if (running) {
      queued = true;
      return running;
    }
    running = (async () => {
      try {
        do {
          queued = false;
          await runOnce();
        } while (queued);
      } catch {
        // Nothing here may fail the build or stop the watcher (a `write` that
        // throws, for example). The next run starts from a clean state.
      } finally {
        running = null;
      }
    })();
    return running;
  }

  function watch(watcher) {
    const roots = dirs.map((dir) => resolve(cwd, dir));
    let timer = null;
    watcher.on("all", (_event, filePath) => {
      if (!roots.some((root) => isInside(root, resolve(cwd, filePath)))) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        run().catch(() => {});
      }, debounceMs);
      timer.unref?.();
    });
  }

  return { run, watch };
}
