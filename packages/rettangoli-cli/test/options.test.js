import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectValues,
  parseIntegerOption,
  parseIsolationOption,
  parsePortOption,
} from "../src/options.js";

test("collectValues appends without mutating earlier option values", () => {
  const previous = ["first"];

  assert.deepEqual(collectValues("second", previous), ["first", "second"]);
  assert.deepEqual(previous, ["first"]);
});

test("parseIntegerOption accepts signed safe integers", () => {
  assert.equal(parseIntegerOption("-12"), -12);
  assert.equal(parseIntegerOption("0"), 0);
  assert.equal(parseIntegerOption("42"), 42);
});

test("parseIntegerOption rejects non-integers and unsafe integers", () => {
  for (const value of ["1.5", "12px", "", "9007199254740992"]) {
    assert.throws(() => parseIntegerOption(value));
  }
});

test("parsePortOption enforces the TCP port range", () => {
  assert.equal(parsePortOption("1"), 1);
  assert.equal(parsePortOption("65535"), 65535);
  assert.throws(() => parsePortOption("0"), /Port must be between/);
  assert.throws(() => parsePortOption("65536"), /Port must be between/);
});

test("parseIsolationOption only accepts supported VT modes", () => {
  assert.equal(parseIsolationOption("fast"), "fast");
  assert.equal(parseIsolationOption("strict"), "strict");
  assert.throws(() => parseIsolationOption("automatic"), /Isolation must be/);
});
