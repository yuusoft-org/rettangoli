/**
 * Documents a constraint that is easy to violate and expensive to discover.
 *
 * `ensureNormalizedTemplatePropertyBindings` is guarded by a module-level
 * WeakSet. That looks like memoization — an optimisation you could drop, or
 * replace by normalizing once at build time — but it is a CORRECTNESS GUARD.
 *
 * Normalization rewrites `:value=${title}` to `:value=title`, and the validator
 * rejects that bare form. So the pass is NOT idempotent: run it twice on the
 * same template *shape* and the second run throws.
 *
 * The WeakSet works today because the build inlines the RAW parsed AST and
 * normalization happens once per template object at runtime. It would stop
 * working the moment a normalized template is serialized and reloaded, because
 * the clone arrives with a fresh object identity.
 *
 * If you are here because you want to move normalization to build time: this
 * is why you cannot, not without also making the validator accept the
 * normalized form.
 */

import { describe, expect, it } from "vitest";
import { ensureNormalizedTemplatePropertyBindings } from "../../src/core/view/templatePropertyBindings.js";
import jemplParse from "jempl/src/parse/index.js";

const parse = (raw) => jemplParse(JSON.parse(JSON.stringify(raw)));

describe("template property-binding normalization", () => {
  it("rewrites the interpolation form to a bare path", () => {
    const template = parse([{ "x-child :value=${title}": null }]);
    ensureNormalizedTemplatePropertyBindings(template);
    expect(JSON.stringify(template)).toContain("x-child :value=title");
  });

  it("is a no-op on the same object the second time (identity-guarded)", () => {
    const template = parse([{ "x-child :value=${title}": null }]);
    ensureNormalizedTemplatePropertyBindings(template);
    const once = JSON.stringify(template);

    expect(() => ensureNormalizedTemplatePropertyBindings(template)).not.toThrow();
    expect(JSON.stringify(template)).toBe(once);
  });

  it("THROWS on a structurally identical clone — the pass is not idempotent", () => {
    const template = parse([{ "x-child :value=${title}": null }]);
    ensureNormalizedTemplatePropertyBindings(template);

    // A build-time-serialized AST arrives with a new object identity, so the
    // WeakSet does not recognise it and the validator sees `:value=title`.
    const clone = JSON.parse(JSON.stringify(template));
    expect(() => ensureNormalizedTemplatePropertyBindings(clone)).toThrow(
      /Property-form bindings must use/,
    );
  });

  it("accepts a freshly parsed template every time", () => {
    for (let i = 0; i < 3; i += 1) {
      const template = parse([{ "x-child :value=${title}": null }]);
      expect(() => ensureNormalizedTemplatePropertyBindings(template)).not.toThrow();
    }
  });
});
