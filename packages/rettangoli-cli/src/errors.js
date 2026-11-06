import { inspect } from "node:util";

// A mistake the user can fix (missing or invalid config, for example). It is
// printed without the stack trace hint.
export class CliUserError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "CliUserError";
  }
}

const MAX_CAUSE_DEPTH = 5;

// Programming errors: their stack is printed even without RTGL_DEBUG.
const STACK_ERROR_TYPES = [TypeError, ReferenceError, SyntaxError, RangeError];

// Errors and objects that act like one, such as the ResolveMessage bun throws
// for a missing package.
function isErrorLike(value) {
  return (
    value instanceof Error ||
    (value !== null && typeof value === "object" && typeof value.message === "string")
  );
}

function describe(value) {
  if (isErrorLike(value)) {
    return value.message || String(value);
  }
  return value !== null && typeof value === "object" ? inspect(value) : String(value);
}

function isPrimitive(value) {
  return ["string", "number", "boolean", "bigint"].includes(typeof value);
}

export function formatCliError(error, { debug = false } = {}) {
  const lines = [`rtgl: ${describe(error)}`];
  const printed = () => lines.join("\n");

  // Causes whose message is already part of the output (config.js inlines the
  // YAML error, for example) are not repeated.
  let cause = error?.cause;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && cause != null; depth += 1) {
    const message = describe(cause);
    if (!printed().includes(message)) {
      lines.push(`  caused by: ${message}`);
    }
    cause = cause?.cause;
  }

  if (!isErrorLike(error)) {
    return printed();
  }

  if (debug || STACK_ERROR_TYPES.some((type) => error instanceof type)) {
    lines.push(inspect(error, { depth: MAX_CAUSE_DEPTH }));
    return printed();
  }

  if (!(error instanceof CliUserError)) {
    // Extra details such as code, id, plugin or frame, unless the message
    // already shows them.
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(error))) {
      if (
        key === "name" ||
        !descriptor.enumerable ||
        !("value" in descriptor) ||
        !isPrimitive(descriptor.value)
      ) {
        continue;
      }
      const value = String(descriptor.value);
      if (!printed().includes(value)) {
        lines.push(`  ${key}: ${value}`);
      }
    }
    lines.push("(set RTGL_DEBUG=1 to print the stack trace)");
  }

  return printed();
}

function isDebug(env) {
  return Boolean(env.RTGL_DEBUG) && env.RTGL_DEBUG !== "0";
}

// Runs the CLI. On a failure it prints one readable error and exits with 1
// right away, even when a server or watcher is still holding the event loop
// open (the same exit behavior as an uncaught error before).
export async function runWithErrorBoundary(
  main,
  {
    stderr = process.stderr,
    stdout = process.stdout,
    exit = (code) => process.exit(code),
    env = process.env,
  } = {},
) {
  try {
    await main();
  } catch (error) {
    // Still exit 1 if the event loop drains before the writes call back.
    process.exitCode = 1;
    const fallback = setTimeout(() => exit(1), 2000);
    fallback.unref();
    stderr.write(`${formatCliError(error, { debug: isDebug(env) })}\n`, () => {
      // A zero-length write calls back once earlier stdout writes are flushed.
      stdout.write("", () => {
        clearTimeout(fallback);
        exit(1);
      });
    });
  }
}
