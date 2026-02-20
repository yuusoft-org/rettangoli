#!/usr/bin/env node

import {
  parseYahtmlSelectorKey,
  tokenizeYahtmlSelectorKey,
} from "../src/core/parsers.js";

const CASES = 400;

const seededRandom = (seed = 20260214) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const pick = (rng, values) => values[Math.floor(rng() * values.length)];

const maybe = (rng, chance = 0.5) => rng() < chance;

const createIdentifier = (rng, prefix = "x") => {
  const suffix = Math.floor(rng() * 10000).toString(36);
  return `${prefix}${suffix}`;
};

const createAttrToken = (rng) => {
  const style = Math.floor(rng() * 10);
  const attrName = pick(rng, ["title", "data-id", "role", "value", "disabled", "aria-label"]);

  if (style === 0) return `${attrName}=text`;
  if (style === 1) return `:${attrName}=${"${"}${pick(rng, ["title", "state.count", "form.value"])}${"}"}`;
  if (style === 2) return `?${attrName}=${"${"}${pick(rng, ["enabled", "isOpen", "ready"])}${"}"}`;
  if (style === 3) return `@${pick(rng, ["click", "tap", "value-change"])}=${pick(rng, ["handleTap", "handleClick", "onInput"])} `;
  if (style === 4) return `.${attrName}=legacy`;
  if (style === 5) return `=${"${"}${createIdentifier(rng, "bad")}${"}"}`;
  if (style === 6) return `${pick(rng, [":", "@", "?"])}${createIdentifier(rng, "k")}`;
  if (style === 7) return `${attrName}='unterminated`;
  if (style === 8) return `${attrName}={{{`;
  return `${createIdentifier(rng, "k")}`;
};

const createSelectorKey = (rng) => {
  const malformedSelector = maybe(rng, 0.15);
  const selector = malformedSelector
    ? pick(rng, ["", ":invalid", "$if condition", "@@bad"])
    : `${pick(rng, ["rtgl-view", "rtgl-button", "rtgl-input", "rtgl-card"])}${maybe(rng, 0.4) ? `#${createIdentifier(rng, "id")}` : ""}`;

  const tokenCount = 1 + Math.floor(rng() * 4);
  const tokens = [];
  for (let index = 0; index < tokenCount; index += 1) {
    tokens.push(createAttrToken(rng));
  }

  return `${selector} ${tokens.join(" ")}`.trim();
};

const stripUndefined = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefined(entry));
  }
  if (value && typeof value === "object") {
    const cleaned = {};
    Object.keys(value).forEach((key) => {
      if (value[key] !== undefined) {
        cleaned[key] = stripUndefined(value[key]);
      }
    });
    return cleaned;
  }
  return value;
};

const normalized = (value) => JSON.stringify(stripUndefined(value));

const main = () => {
  const rng = seededRandom(20260214);
  const failures = [];

  for (let index = 0; index < CASES; index += 1) {
    const rawKey = createSelectorKey(rng);

    try {
      const tokenA = tokenizeYahtmlSelectorKey(rawKey);
      const tokenB = tokenizeYahtmlSelectorKey(rawKey);
      if (normalized(tokenA) !== normalized(tokenB)) {
        failures.push({ index, rawKey, reason: "tokenizer non-deterministic output" });
        continue;
      }

      const parseA = parseYahtmlSelectorKey({
        rawKey,
        line: 1,
        lineText: rawKey,
      });
      const parseB = parseYahtmlSelectorKey({
        rawKey,
        line: 1,
        lineText: rawKey,
      });
      if (normalized(parseA) !== normalized(parseB)) {
        failures.push({ index, rawKey, reason: "parser non-deterministic output" });
        continue;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ index, rawKey, reason: `threw '${message}'` });
    }

    if (failures.length >= 20) {
      break;
    }
  }

  if (failures.length > 0) {
    console.error(`YAHTML parser fuzz failures: ${failures.length}`);
    failures.forEach((failure) => {
      console.error(`\n[case ${failure.index}] ${failure.reason}`);
      console.error(failure.rawKey);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`YAHTML parser fuzz pass: ${CASES} generated selector keys.`);
};

main();
