// Recording helpers shared by the fake @rettangoli/* packages. Every import
// and call is appended to RTGL_TRACE_FILE as one JSON line.
import { appendFileSync } from "node:fs";

// JSON-safe copy of a value. Plain JSON would drop `undefined` keys and turn
// NaN or -0 into null/0, which are exactly the values the golden must keep.
export function serialize(value, ancestors = []) {
  if (value === undefined) return { $undefined: true };
  if (typeof value === "function") return { $fn: value.name };
  if (typeof value === "number") {
    if (Object.is(value, -0)) return { $number: "-0" };
    if (!Number.isFinite(value)) return { $number: String(value) };
    return value;
  }
  if (value === null || typeof value !== "object") return value;
  if (ancestors.includes(value)) return { $circular: true };

  const path = [...ancestors, value];
  if (Array.isArray(value)) return value.map((item) => serialize(item, path));
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, serialize(value[key], path)]),
  );
}

export function record(event, payload) {
  appendFileSync(
    process.env.RTGL_TRACE_FILE,
    `${JSON.stringify({ event, payload: serialize(payload) })}\n`,
  );
}

// A recording stand-in for one package function.
//   FAKE_THROW=<name>   throws synchronously
//   FAKE_REJECT=<name>  returns a promise rejected with a plain string. Node
//                       reports that as ERR_UNHANDLED_REJECTION when the CLI
//                       did not await the call and as a bare line when it did,
//                       which is how the goldens tell the two apart.
//   FAKE_DELAY=<name>   returns a promise that settles later and announces it
//                       on stdout, so output order shows whether it was awaited
export function fake(name, implementation = () => undefined) {
  const fn = (...args) => {
    record("call", { fn: name, args });
    if (process.env.FAKE_THROW === name) {
      throw new Error(`fake ${name} failure`, {
        cause: new Error("fake cause"),
      });
    }
    if (process.env.FAKE_REJECT === name) {
      return Promise.reject(`fake ${name} rejection`);
    }
    if (process.env.FAKE_DELAY === name) {
      return new Promise((resolve) => {
        setTimeout(() => {
          process.stdout.write(`[fake ${name} settled]\n`);
          record("settle", { fn: name });
          resolve(implementation(...args));
        }, 150);
      });
    }
    return implementation(...args);
  };
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}
