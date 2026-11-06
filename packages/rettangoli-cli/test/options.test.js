import assert from "node:assert/strict";
import { test } from "node:test";
import { InvalidArgumentError } from "commander";
import {
  collectValues,
  parseIntegerOption,
  parseIsolationOption,
  parseNumberOption,
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

// "0.8" is route-engine's value; "5%" keeps today's result (5).
test("parseNumberOption returns the parseFloat value for every complete number", () => {
  for (const value of [
    "0.8", "0.5", "0", "-0", "1", "100", "0.3", ".5", "5.", "+0.5", "-1",
    "1e-1", "1E2", "1e-3", "0.8\r", " 0.5 ", "007", "5%", "0.5%", "1e999",
  ]) {
    assert.ok(Object.is(parseNumberOption(value), parseFloat(value)), JSON.stringify(value));
  }
});

test("parseNumberOption rejects input that parseFloat would truncate or not read", () => {
  for (const value of [
    "0,5", "0,9", "abc", ".1x", "0x10", "Infinity", "-Infinity", "NaN", "", " ",
    "1/2", "0.5.1", "%", "5%%", "e5", ".", "1e", "--1",
  ]) {
    assert.throws(
      () => parseNumberOption(value),
      (error) =>
        error instanceof InvalidArgumentError &&
        error.message === `Expected a number (use "." for decimals) but received "${value}"`,
      JSON.stringify(value),
    );
  }
});
