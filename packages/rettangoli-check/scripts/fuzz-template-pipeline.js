#!/usr/bin/env node

import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import { parse as parseJempl } from "jempl";
import { parseElementKey } from "yahtml";
import {
  collectSelectorBindingsFromView,
  collectTemplateAstFromView,
} from "../src/core/parsers.js";

const CASES = 250;
const MAX_DEPTH = 3;

const seededRandom = (seed = 20260214) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const pick = (rng, values) => values[Math.floor(rng() * values.length)];

const createIdent = (rng, prefix = "x") => {
  const suffix = Math.floor(rng() * 1000);
  return `${prefix}${suffix}`;
};

const createAttrToken = (rng) => {
  const name = pick(rng, ["w", "g", "c", "data-id", "role", "title"]);
  const style = Math.floor(rng() * 4);
  if (style === 0) return `${name}=f`;
  if (style === 1) return `:${name}=\${${pick(rng, ["count", "items.length", "user.name"])}}`;
  if (style === 2) return `?${name}=\${${pick(rng, ["isOpen", "enabled", "visible"])}}`;
  return `@${pick(rng, ["click", "tap", "value-change"])}=${pick(rng, ["handleTap", "handleClick"])}`;
};

const createSelectorKey = (rng) => {
  const tag = pick(rng, ["rtgl-view", "rtgl-text", "rtgl-input", "rtgl-button"]);
  const id = rng() > 0.6 ? `#${createIdent(rng, "el")}` : "";
  const attrCount = 1 + Math.floor(rng() * 3);
  const attrs = [];
  for (let i = 0; i < attrCount; i += 1) {
    attrs.push(createAttrToken(rng));
  }
  return `${tag}${id} ${attrs.join(" ")}`.trim();
};

const createTemplateNode = (rng, depth = 0) => {
  if (depth >= MAX_DEPTH) {
    return {
      [createSelectorKey(rng)]: pick(rng, ["${title}", "${count}", null]),
    };
  }

  const shape = Math.floor(rng() * 4);
  if (shape === 0) {
    return {
      [`$if ${pick(rng, ["isOpen", "count > 0", "user.enabled"])}`]: [
        createTemplateNode(rng, depth + 1),
      ],
    };
  }
  if (shape === 1) {
    return {
      [`$for item, i in ${pick(rng, ["items", "user.items", "list"])}`]: [
        createTemplateNode(rng, depth + 1),
      ],
    };
  }
  return {
    [createSelectorKey(rng)]: rng() > 0.5
      ? [{ [createSelectorKey(rng)]: "${item.title}" }]
      : pick(rng, ["${title}", "${count}", null]),
  };
};

const normalizeBindings = (bindings = []) => {
  return bindings.map((binding) => ({
    key: binding.rawKey,
    line: binding.line,
    tag: binding.tagName,
    attrs: [...(binding.bindingNames || [])].sort(),
  }));
};

const normalizeTemplateAst = (templateAst = {}) => {
  return {
    type: templateAst.type,
    nodes: (templateAst.nodes || []).map((node) => ({
      key: node.rawKey,
      line: node?.range?.line,
      attrs: (node.attributes || []).map((attribute) => ({
        bindingName: attribute.bindingName,
        sourceType: attribute.sourceType,
        expressions: [...(attribute.expressions || [])].sort(),
      })),
    })),
  };
};

const main = () => {
  const rng = seededRandom(20260214);
  const failures = [];

  for (let i = 0; i < CASES; i += 1) {
    const template = [createTemplateNode(rng, 0), createTemplateNode(rng, 0)];
    const viewObj = { template };
    const viewText = dumpYaml(viewObj, { lineWidth: -1, noRefs: true });
    const viewYaml = loadYaml(viewText);

    try {
      parseJempl(viewYaml.template);
      const bindingsA = normalizeBindings(collectSelectorBindingsFromView({ viewText, viewYaml }));
      const bindingsB = normalizeBindings(collectSelectorBindingsFromView({ viewText, viewYaml }));
      const astA = normalizeTemplateAst(collectTemplateAstFromView({ viewText, viewYaml }));
      const astB = normalizeTemplateAst(collectTemplateAstFromView({ viewText, viewYaml }));

      const bindingsStable = JSON.stringify(bindingsA) === JSON.stringify(bindingsB);
      const astStable = JSON.stringify(astA) === JSON.stringify(astB);
      if (!bindingsStable || !astStable) {
        failures.push({
          index: i,
          reason: "non-deterministic parse output",
          viewText,
        });
        continue;
      }

      bindingsA.forEach((binding) => {
        parseElementKey(binding.key);
      });
    } catch (error) {
      failures.push({
        index: i,
        reason: error instanceof Error ? error.message : String(error),
        viewText,
      });
    }

    if (failures.length >= 20) {
      break;
    }
  }

  if (failures.length > 0) {
    console.error(`Template pipeline fuzz failures: ${failures.length}`);
    failures.forEach((failure) => {
      console.error(`\n[case ${failure.index}] ${failure.reason}`);
      console.error(failure.viewText);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Template pipeline fuzz pass: ${CASES} generated cases.`);
};

main();
