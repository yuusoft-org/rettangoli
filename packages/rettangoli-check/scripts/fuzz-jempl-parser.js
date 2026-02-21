#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dump as dumpYaml } from "js-yaml";
import { parse as parseJempl } from "jempl";
import { parseJemplForCompiler } from "../src/core/parsers.js";

const GENERATED_CASES = 300;
const MAX_DEPTH = 3;
const RANDOM_SEED = 20260214;

const seededRandom = (seed = RANDOM_SEED) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const pick = (rng, values) => values[Math.floor(rng() * values.length)];

const deepEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const loadCorpusCases = () => {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const corpusPath = path.join(scriptDir, "../test/jempl-fuzz-corpus.json");
  return JSON.parse(readFileSync(corpusPath, "utf8"));
};

const makeIdentifier = (rng, prefix = "v") => `${prefix}${Math.floor(rng() * 999)}`;

const makePath = (rng) => {
  const roots = ["title", "count", "isVisible", "isDisabled", "user", "item", "state"];
  const root = pick(rng, roots);
  if (root === "user" || root === "item" || root === "state") {
    return `${root}.${pick(rng, ["name", "id", "enabled", "items", "title"])}`;
  }
  return root;
};

const makeConditionExpression = (rng, depth = 0) => {
  if (depth >= 2) {
    return makePath(rng);
  }

  const style = Math.floor(rng() * 5);
  if (style === 0) {
    return makePath(rng);
  }
  if (style === 1) {
    return `!${makePath(rng)}`;
  }
  if (style === 2) {
    return `${makePath(rng)} ${pick(rng, ["==", "!=", ">", "<", ">=", "<="]) } ${pick(rng, [makePath(rng), "true", "false", "0", "1"])}`;
  }
  if (style === 3) {
    return `${makeConditionExpression(rng, depth + 1)} && ${makeConditionExpression(rng, depth + 1)}`;
  }
  return `${makeConditionExpression(rng, depth + 1)} || ${makeConditionExpression(rng, depth + 1)}`;
};

const makeAttrToken = (rng) => {
  const tokenType = Math.floor(rng() * 4);
  if (tokenType === 0) {
    return `:${pick(rng, ["title", "value", "count"])}=\${${makePath(rng)}}`;
  }
  if (tokenType === 1) {
    return `?${pick(rng, ["hidden", "visible", "enabled"])}=\${${pick(rng, ["isVisible", "isDisabled", "true", "false"])}}`;
  }
  if (tokenType === 2) {
    return `@${pick(rng, ["click", "change"]) }=${pick(rng, ["handleClick", "handleChange"])}`;
  }
  return `${pick(rng, ["id", "role", "data-id"])}=${makeIdentifier(rng, "x")}`;
};

const makeSelectorKey = (rng) => {
  const tag = pick(rng, ["rtgl-view", "rtgl-text", "rtgl-button", "rtgl-input"]);
  const attrCount = 1 + Math.floor(rng() * 3);
  const attrs = [];
  for (let index = 0; index < attrCount; index += 1) {
    attrs.push(makeAttrToken(rng));
  }
  return `${tag} ${attrs.join(" ")}`;
};

const makeTemplateLeaf = (rng) => {
  const key = makeSelectorKey(rng);
  const payloadStyle = Math.floor(rng() * 3);
  if (payloadStyle === 0) {
    return { [key]: null };
  }
  if (payloadStyle === 1) {
    return { [key]: `\${${makePath(rng)}}` };
  }
  return { [key]: [{ [makeSelectorKey(rng)]: null }] };
};

const makeTemplateNode = (rng, depth = 0) => {
  if (depth >= MAX_DEPTH) {
    return makeTemplateLeaf(rng);
  }

  const shape = Math.floor(rng() * 6);
  if (shape <= 2) {
    return makeTemplateLeaf(rng);
  }
  if (shape === 3) {
    return {
      [`$if ${makeConditionExpression(rng)}`]: [
        makeTemplateNode(rng, depth + 1),
      ],
    };
  }
  if (shape === 4) {
    const itemVar = makeIdentifier(rng, "item");
    const indexVar = makeIdentifier(rng, "idx");
    const iterable = pick(rng, ["items", "state.items", "user.items"]);
    return {
      [`$for(${itemVar}, ${indexVar} in ${iterable})`]: [
        makeTemplateNode(rng, depth + 1),
      ],
    };
  }

  const strictInvalid = Math.floor(rng() * 3);
  if (strictInvalid === 0) {
    return {
      [`$iff ${makeConditionExpression(rng)}`]: {
        [makeSelectorKey(rng)]: null,
      },
    };
  }
  if (strictInvalid === 1) {
    return {
      "$else": {
        [makeSelectorKey(rng)]: null,
      },
    };
  }
  return {
    "$for(item in )": {
      [makeSelectorKey(rng)]: null,
    },
  };
};

const generateCases = () => {
  const rng = seededRandom(RANDOM_SEED);
  const generated = [];

  for (let index = 0; index < GENERATED_CASES; index += 1) {
    generated.push({
      id: `generated-${String(index + 1).padStart(3, "0")}`,
      template: [
        makeTemplateNode(rng, 0),
        makeTemplateNode(rng, 0),
      ],
    });
  }

  return generated;
};

const parseWithRawJempl = (source) => {
  try {
    return {
      ok: true,
      ast: parseJempl(source),
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
};

const run = () => {
  const failures = [];
  const corpusCases = loadCorpusCases();
  const generatedCases = generateCases();
  const allCases = [...corpusCases, ...generatedCases];

  allCases.forEach((testCase) => {
    const expectParse = typeof testCase.expectParse === "boolean"
      ? testCase.expectParse
      : null;
    const source = testCase.template;
    const viewText = dumpYaml({ template: source }, { lineWidth: -1, noRefs: true });

    const rawParse = parseWithRawJempl(source);
    const compilerLooseA = parseJemplForCompiler({
      source,
      viewText,
      fallbackLine: 1,
      strictControlDirectives: false,
    });
    const compilerLooseB = parseJemplForCompiler({
      source,
      viewText,
      fallbackLine: 1,
      strictControlDirectives: false,
    });
    const compilerStrictA = parseJemplForCompiler({
      source,
      viewText,
      fallbackLine: 1,
      strictControlDirectives: true,
    });
    const compilerStrictB = parseJemplForCompiler({
      source,
      viewText,
      fallbackLine: 1,
      strictControlDirectives: true,
    });

    if (!deepEqual(compilerLooseA, compilerLooseB)) {
      failures.push(`${testCase.id}: non-deterministic loose parse result`);
      return;
    }
    if (!deepEqual(compilerStrictA, compilerStrictB)) {
      failures.push(`${testCase.id}: non-deterministic strict parse result`);
      return;
    }

    if (expectParse !== null && rawParse.ok !== expectParse) {
      failures.push(`${testCase.id}: corpus expectation mismatch (raw parse ok=${rawParse.ok}, expectParse=${expectParse})`);
      return;
    }

    if (rawParse.ok) {
      if (compilerLooseA.parseError || compilerStrictA.parseError) {
        failures.push(`${testCase.id}: expected parse success but compiler parser returned parseError`);
        return;
      }
      if (!deepEqual(rawParse.ast, compilerLooseA.ast)) {
        failures.push(`${testCase.id}: loose AST diverges from jempl.parse`);
        return;
      }
      if (!deepEqual(rawParse.ast, compilerStrictA.ast)) {
        failures.push(`${testCase.id}: strict AST diverges from jempl.parse`);
        return;
      }
      if (!compilerLooseA.typedAst || !compilerStrictA.typedAst) {
        failures.push(`${testCase.id}: expected typedAst on parse success`);
        return;
      }
    } else {
      if (!compilerLooseA.parseError || !compilerStrictA.parseError) {
        failures.push(`${testCase.id}: expected parse failure parity with jempl.parse`);
        return;
      }
      if (compilerLooseA.ast !== null || compilerLooseA.typedAst !== null) {
        failures.push(`${testCase.id}: expected null ast/typedAst on loose parse failure`);
        return;
      }
      if (compilerStrictA.ast !== null || compilerStrictA.typedAst !== null) {
        failures.push(`${testCase.id}: expected null ast/typedAst on strict parse failure`);
        return;
      }
      if ((compilerStrictA.controlDiagnostics || []).length !== 0) {
        failures.push(`${testCase.id}: expected no strict control diagnostics when parse fails`);
        return;
      }
    }

    const strictDiagnosticIncludes = Array.isArray(testCase.strictDiagnosticIncludes)
      ? testCase.strictDiagnosticIncludes
      : [];
    if (strictDiagnosticIncludes.length > 0) {
      const diagnostics = Array.isArray(compilerStrictA.controlDiagnostics)
        ? compilerStrictA.controlDiagnostics
        : [];
      const message = diagnostics.map((diagnostic) => diagnostic?.message || "").join(" || ");
      strictDiagnosticIncludes.forEach((needle) => {
        if (!message.includes(needle)) {
          failures.push(`${testCase.id}: strict diagnostics missing '${needle}'`);
        }
      });
    }
  });

  if (failures.length > 0) {
    console.error(`Jempl parser fuzz+differential failures: ${failures.length}`);
    failures.slice(0, 40).forEach((failure) => {
      console.error(`- ${failure}`);
    });
    process.exit(1);
  }

  console.log(
    `Jempl parser fuzz+differential pass: ${allCases.length} case(s) (corpus=${corpusCases.length}, generated=${generatedCases.length}).`,
  );
};

run();
