import { describe, expect, it } from "vitest";
import { createSteps } from "../../src/createSteps.js";

// customEvent built "key=value" tokens from the structured `detail` and split them
// on every "=", so values and keys containing "=" (query strings, base64 padding, JSON) arrived
// truncated or shifted. Values now arrive intact; they are still strings (non-strings are JSON-encoded).

function createPage() {
  const payloads = [];
  return {
    payloads,
    async evaluate(fn, arg) {
      // Clone the way Playwright serializes plain JSON arguments.
      payloads.push(JSON.parse(JSON.stringify(arg)));
    },
  };
}

async function dispatch(step) {
  const page = createPage();
  await createSteps(page, {}).executeStep(step);
  return page.payloads[0];
}

const detailOf = async (detail) => (await dispatch({ action: "customEvent", name: "evt", detail })).payload;

describe("customEvent detail containing '='", () => {
  it.each([
    ["a=b&c=d"],
    ["/project?id=abc&tab=2"],
    ["YWJj=="],
    ["=x"],
  ])("string value %j arrives intact", async (value) => {
    expect(await detailOf({ value })).toEqual({ value });
  });

  it("nested JSON containing '=' arrives as parseable JSON", async () => {
    const detail = await detailOf({ actions: { jumpToLine: { lineId: "a=b" } } });
    expect(JSON.parse(detail.actions)).toEqual({ jumpToLine: { lineId: "a=b" } });
  });

  it("a key containing '=' stays the key", async () => {
    expect(await detailOf({ "a=b": "c" })).toEqual({ "a=b": "c" });
  });

  it("a legacy block token splits at the first '='", async () => {
    expect((await dispatch({ "customEvent evt a=b=c": [] })).payload).toEqual({ a: "b=c" });
  });

  it("dispatches the event name with the payload", async () => {
    expect(await dispatch({ action: "customEvent", name: "evt", detail: { q: "x=1" } }))
      .toEqual({ eventName: "evt", payload: { q: "x=1" } });
  });
});

describe("unchanged customEvent behavior", () => {
  it("non-string values arrive JSON-encoded as strings", async () => {
    expect(await detailOf({ zero: 0, yes: true, obj: { k: 1 }, nothing: null, list: [1, "x"] }))
      .toEqual({ zero: "0", yes: "true", obj: '{"k":1}', nothing: "null", list: '[1,"x"]' });
  });

  it("strings without '=' and empty strings are unchanged", async () => {
    expect(await detailOf({ spaced: "hello world", empty: "" })).toEqual({ spaced: "hello world", empty: "" });
  });

  it("no detail sends an empty payload", async () => {
    expect(await dispatch({ action: "customEvent", name: "evt" })).toEqual({ eventName: "evt", payload: {} });
  });

  it("an empty key throws the same message", async () => {
    await expect(detailOf({ "": "v" })).rejects.toThrow('Invalid customEvent argument "=v". Expected key=value.');
  });

  it("a legacy token without '=' throws the same message", async () => {
    await expect(dispatch({ "customEvent evt oops": [] })).rejects.toThrow(
      'Invalid customEvent argument "oops". Expected key=value.',
    );
  });

  it("legacy tokens keep working", async () => {
    expect((await dispatch({ "customEvent evt a=1 b=two": [] })).payload).toEqual({ a: "1", b: "two" });
  });
});
