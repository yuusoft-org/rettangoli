#!/usr/bin/env node

// Parity between the FE rules that @rettangoli/check re-implements and the FE in this monorepo.
//
// Every section runs the same inputs through check and through FE and counts the inputs where the
// two disagree. KNOWN_DRIFT records how many disagreements are known today. The test fails when a
// section's count differs from its entry, in either direction, so a change that fixes (or
// introduces) drift must update the ledger in the same change.
//
// This script reads FE by relative path on purpose; src/ must never import FE
// (see test-no-fe-contracts-import.js).

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { parse as parseJempl } from "jempl";
import { NodeType } from "jempl/src/parse/constants.js";
import {
  collectBindingNames as checkCollectBindingNames,
  createRefMatchers as checkCreateRefMatchers,
  findUnsupportedTemplatePropertyBindingSyntax as checkFindUnsupportedPropertyBinding,
  getNodeBindingViolation as checkGetNodeBindingViolation,
  validateElementIdForRefs as checkValidateElementIdForRefs,
  validateEventConfig as checkValidateEventConfig,
} from "../src/core/fe-contracts.js";
import { analyzeProject } from "../src/core/analyze.js";
import {
  collectBindingNames as feCollectBindingNames,
  createRefMatchers as feCreateRefMatchers,
  parseNodeBindings as feParseNodeBindings,
  validateElementIdForRefs as feValidateElementIdForRefs,
  validateEventConfig as feValidateEventConfig,
  validateSchemaContract as feValidateSchemaContract,
} from "../../rettangoli-fe/src/contracts/index.js";
import { findUnsupportedTemplatePropertyBindingSyntax as feFindUnsupportedPropertyBinding } from "../../rettangoli-fe/src/core/view/templatePropertyBindings.js";
import { parseView as feParseView } from "../../rettangoli-fe/src/parser.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(currentDir, "..");
const workspaceRoot = path.resolve(currentDir, "../../..");

// Known disagreements between check and FE, per section. `count` is exact.
// Fixing a disagreement lowers the count (down to 0, then delete the entry); adding a new
// disagreement raises it. Sections without an entry must have no disagreements.
const KNOWN_DRIFT = {
  idRefs: {
    count: 4,
    findings: ["id attribute precedence"],
    note: "REF-002 only reads the '#id' of the selector. FE also reads the 'id=' attribute and lets it win: check "
      + "misses kebab 'id=' values (2) and a kebab attribute next to a camelCase '#id' (1), and reports a kebab '#id' "
      + "that an 'id=' attribute overrides (1). A later check change re-checks this against FE's id handling.",
  },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const errorMessage = (error) => (error instanceof Error ? error.message : String(error));

// Runs fn and reports either its (JSON-comparable) result or the error message.
const outcomeOf = (fn) => {
  try {
    return { value: JSON.stringify(fn()) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
};

const describeOutcome = (outcome) => (outcome.error !== undefined ? `throws "${outcome.error}"` : `returns ${outcome.value}`);

const sameOutcome = (left, right) => left.error === right.error && left.value === right.value;

const compareOutcomes = (inputs, checkFn, feFn) => {
  const mismatches = [];
  inputs.forEach(({ label, input }) => {
    const check = outcomeOf(() => checkFn(input));
    const fe = outcomeOf(() => feFn(input));
    if (!sameOutcome(check, fe)) {
      mismatches.push({ input: label, check: describeOutcome(check), fe: describeOutcome(fe) });
    }
  });
  return { inputCount: inputs.length, mismatches };
};

// mulberry32: tiny seeded PRNG so the generated matrix is identical on every run.
const createRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const labelOf = (value) => {
  if (value === undefined) return "undefined";
  if (typeof value === "number" && !Number.isFinite(value)) return String(value);
  return JSON.stringify(value);
};

// Same split FE's createVirtualDom applies to a template key.
const splitSelectorKey = (key) => {
  const firstSpaceIndex = key.indexOf(" ");
  if (firstSpaceIndex === -1) {
    return { selector: key, attrsString: "" };
  }
  return { selector: key.slice(0, firstSpaceIndex), attrsString: key.slice(firstSpaceIndex + 1).trim() };
};

const collectTemplateKeys = (node, keys = []) => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectTemplateKeys(item, keys));
  } else if (node && typeof node === "object") {
    Object.entries(node).forEach(([key, value]) => {
      keys.push(key);
      collectTemplateKeys(value, keys);
    });
  }
  return keys;
};

const listFiles = (dirPath, suffix) => {
  return readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : listFiles(entryPath, suffix);
    }
    return entry.name.endsWith(suffix) ? [entryPath] : [];
  }).sort();
};

// Writes one component per case into a throwaway project and runs one analyzeProject over all of them.
// Returns a Map from case name to that component's diagnostics.
const analyzeCases = async (cases) => {
  const projectRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "rtgl-fe-parity-")));
  try {
    cases.forEach(({ name, files }) => {
      const componentDir = path.join(projectRoot, "src", "components", name);
      mkdirSync(componentDir, { recursive: true });
      Object.entries(files).forEach(([extension, text]) => {
        writeFileSync(path.join(componentDir, `${name}.${extension}`), text, "utf8");
      });
    });

    const result = await analyzeProject({
      cwd: projectRoot,
      dirs: ["./src/components"],
      includeYahtml: true,
      workspaceRoot,
    });

    const byCase = new Map(cases.map(({ name }) => [name, []]));
    result.diagnostics.forEach((diagnostic) => {
      const caseName = `${diagnostic.filePath || ""}`.split(path.sep).slice(-2, -1)[0];
      if (byCase.has(caseName)) {
        byCase.get(caseName).push(diagnostic);
      }
    });
    return byCase;
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
};

const caseName = (index) => `case${String(index).padStart(3, "0")}`;
const hasCode = (diagnostics, prefix) => diagnostics.some((diagnostic) => diagnostic.code.startsWith(prefix));
const dumpYaml = (value) => yaml.dump(value, { lineWidth: -1 });

// ---------------------------------------------------------------------------
// sections: each returns { inputCount, mismatches: [{ input, check, fe }] }
// ---------------------------------------------------------------------------

// a: ref keys and element ids
const compareRefs = () => {
  const refKeys = [
    "submitButton", "#submitButton", "submitButton*", "#submitButton*", "a", "a1", "aB9", "x*", "#x",
    "Submit", "#Submit", "submit-button", "#submit-button", "submit_button", "1a", "#1a", "", "#", "*", "**", "a**",
    ".btn", ".btn*", ".my-class", ".my_class", ".Btn", ".A1", ".1cls", ".-x", ".", ".*", ".cls**",
    "window", "document", "window*", "document*", "#window", "#document", ".window", ".document", "#window*",
    "windows", "documents", "Window", " a", "a ", "a b", "a.b", "a#b", "#a#b", "..a", "##a", "$ref", "@ref", "ref!",
    "ünï", "a\n", "a ",
  ];
  const elementIds = [
    "submit", "submitButton", "a", "a1", "aB", "x9", "my-id", "main-content", "Submit", "SUBMIT", "1a", "", " ", "a b",
    "a_b", "a.b", "a#b", "-a", "a-", "a--b", "é", "item1", "item-1", "$x", "a\n",
  ];

  const refInputs = refKeys.map((key) => ({ label: `ref ${labelOf(key)}`, input: { [key]: { eventListeners: {} } } }));
  const validKeys = refKeys.filter((key) => outcomeOf(() => feCreateRefMatchers({ [key]: {} })).error === undefined);
  refInputs.push({
    label: "all valid ref keys together",
    input: Object.fromEntries(validKeys.map((key) => [key, { eventListeners: {} }])),
  });
  refInputs.push({ label: "refs undefined", input: undefined });
  refInputs.push({ label: "refs null", input: null });
  refInputs.push({ label: "refs {}", input: {} });

  const matchers = compareOutcomes(refInputs, checkCreateRefMatchers, feCreateRefMatchers);
  const ids = compareOutcomes(
    elementIds.map((id) => ({ label: `element id ${labelOf(id)}`, input: id })),
    checkValidateElementIdForRefs,
    feValidateElementIdForRefs,
  );
  return {
    inputCount: matchers.inputCount + ids.inputCount,
    mismatches: [...matchers.mismatches, ...ids.mismatches],
  };
};

// b: listener option validation over a seeded matrix
const compareEventConfig = () => {
  const ABSENT = Symbol("absent");
  const booleanValues = [ABSENT, true, false, "yes", 1, 0, null, undefined];
  const numberValues = [ABSENT, 0, 25, -1, "5", NaN, Infinity, null, undefined];
  const symbolValues = [ABSENT, "handleTap", "", "bad name", 5, true, null, undefined];
  const booleanOptions = ["preventDefault", "stopPropagation", "stopImmediatePropagation", "targetOnly", "once"];

  const random = createRandom(20240611);
  const pick = (values) => values[Math.floor(random() * values.length)];
  const configs = [];

  for (let i = 0; i < 2400; i += 1) {
    const config = {};
    const assign = (key, values) => {
      const value = pick(values);
      if (value !== ABSENT) {
        config[key] = value;
      }
    };
    booleanOptions.forEach((option) => {
      if (random() < 0.3) assign(option, booleanValues);
    });
    if (random() < 0.4) assign("debounce", numberValues);
    if (random() < 0.4) assign("throttle", numberValues);
    assign("handler", symbolValues);
    assign("action", symbolValues);
    if (random() < 0.1) config.foo = pick([1, "x", true]);
    if (random() < 0.1) config.payload = pick([{}, { id: "${item.id}" }, "${item}", [1], 5]);
    configs.push(config);
  }
  configs.push(
    null, undefined, 5, "click", true, false, [], [1], () => {}, {},
    { handler: "handleTap", action: "doIt" },
    { handler: "handleTap", debounce: 5, throttle: 5 },
    { action: "doIt", debounce: undefined, throttle: undefined },
  );

  return compareOutcomes(
    configs.map((eventConfig, index) => ({ label: `config #${index} ${labelOf(eventConfig)}`, input: eventConfig })),
    (eventConfig) => checkValidateEventConfig({ eventType: "click", eventConfig, refKey: "submitButton" }),
    (eventConfig) => feValidateEventConfig({ eventType: "click", eventConfig, refKey: "submitButton" }),
  );
};

// c: binding names of every template key in the ui views and the check scenarios, plus synthetic strings
const compareBindingNames = () => {
  const syntheticAttrs = [
    ":value=${user[\"full name\"]} placeholder=\"x y\"",
    "label=${a b} ?checked",
    "title=${a} ${b}",
    "?hidden",
    "?hidden=${flag}",
    "?disabled=${a == 1}",
    "href=${url} 1invalid",
    "${attrs}",
    "${item.attrString} class=x",
    "data-${k}=1",
    "class=\"a b\" id=x",
    "title='it is' alt=\"say 'hi'\"",
    ".value=${v} :other=${w}",
    "=x",
    ":=x",
    "@click=${h}",
    "@click",
    "a=1 a=2",
    "x=\"\" y='' z=",
    "?aria-hidden=${x} ?data-x ?role",
    "w=100% h=${height}px",
    "src=${a.b[\"c d\"]} alt=x",
    "  spaced   out  ",
  ];

  const attrsStrings = new Map(syntheticAttrs.map((attrs) => [attrs, "synthetic"]));
  const corpus = [
    ...listFiles(path.resolve(packageDir, "../rettangoli-ui/src/components"), ".view.yaml"),
    ...listFiles(path.resolve(packageDir, "test/scenarios"), ".view.yaml"),
  ];
  corpus.forEach((viewPath) => {
    let template;
    try {
      template = yaml.load(readFileSync(viewPath, "utf8"))?.template;
    } catch {
      return; // scenarios with deliberately broken YAML have no keys to compare
    }
    collectTemplateKeys(template).forEach((key) => {
      if (key.startsWith("$")) {
        return; // control directives are not selector keys
      }
      const { attrsString } = splitSelectorKey(key);
      if (attrsString && !attrsStrings.has(attrsString)) {
        attrsStrings.set(attrsString, path.relative(packageDir, viewPath));
      }
    });
  });

  return compareOutcomes(
    [...attrsStrings].map(([attrs, source]) => ({ label: `${labelOf(attrs)} (${source})`, input: attrs })),
    checkCollectBindingNames,
    feCollectBindingNames,
  );
};

// d: CONTRACT-003 detection (FE findUnsupportedTemplatePropertyBindingSyntax and check's copy)
const comparePropertyBindingSyntax = () => {
  const templateOf = (key) => [{ "rtgl-view": [{ [key]: null }] }];
  const keys = [
    "rtgl-input .value=${title}",
    "rtgl-input .value=title",
    "rtgl-input .value = x",
    "rtgl-input .value=\"${title}\"",
    "rtgl-select .options=items",
    "rtgl-select .options=\"${items}\"",
    "rtgl-input :value=${title}",
    "rtgl-input :value=\"${title}\"",
    "rtgl-input :value='${title}'",
    "rtgl-input :value=title",
    "rtgl-input :value=literal",
    "rtgl-input :value=${a.b}",
    "rtgl-input :value=${a + b}",
    "rtgl-input :value=${title} placeholder=x",
    "rtgl-select :options=items",
    "rtgl-select :items=${items}",
    "rtgl-select :n=${5}",
    "rtgl-select :n=5",
    "rtgl-select :flag=true",
    "rtgl-select :text=\"hello\"",
    "rtgl-select :obj=${ {a: 1} }",
    "rtgl-select :title=${a} :other=literal",
    "div title=\".value=x\"",
    "div title=\"a .b=c\"",
    "div title='a .b=c'",
    "div title=${a} .class=x",
    "div config.retries=3",
    "div data-x=a.b=c",
    "div .5x=1",
    "div ._private=1",
    "div .a-b=1",
    "div a .b=1",
    "div ?hidden .value=${v}",
    "div $if.x=1",
    "rtgl-view p=md",
    "rtgl-view",
    "rtgl-view#id.class :value=${x}",
    "rtgl-view .value=${x}",
  ];
  const templates = [
    ...keys.map((key) => ({ label: `key ${labelOf(key)}`, input: templateOf(key) })),
    { label: "legacy prop under $if", input: [{ "$if cond": [{ "rtgl-input .value=${x}": null }] }] },
    { label: "legacy prop under $for", input: [{ "$for item in items": [{ "rtgl-input .value=${item}": null }] }] },
    { label: "bare :prop under $for", input: [{ "$for item in items": [{ "rtgl-input :value=item": null }] }] },
    { label: "empty template", input: [] },
    { label: "null template", input: null },
    { label: "string template", input: "div .value=x" },
  ];

  return compareOutcomes(
    templates,
    checkFindUnsupportedPropertyBinding,
    feFindUnsupportedPropertyBinding,
  );
};

// e: FE parseNodeBindings throws vs check's getNodeBindingViolation (BINDING-001/002/003), same message.
const compareNodeBindings = () => {
  const attrStrings = [
    "", "class=a", "id=x", "title=\"a b\"", "href=${url}", "data-id=5", "aria-label=\"x\"", "role=button", "disabled",
    "?disabled", "?disabled=${x}", "?disabled=true", "?disabled=false", "?hidden ?open", ":value=${v}", ":value-x=${v}",
    ".value=${v}", ".value=literal",
    "@click=${h}", "@click", "@select=handleSelect",
    "?aria-hidden=${x}", "?aria-pressed=true", "?aria-label", "?data-x", "?data-open=${x}", "?role", "?role=${r}",
    "=x", ":=x", "?=x", "?", ":", "?:x",
    "1bad=1", "bad!=1", "bad name=1", "ba$d=1", "-x=1", "_ok=1", "a.b=1", "a:b=1", "a-b=1",
    "!bad", "1bad", "bad!", "(x)",
    ":foo-bar=${a} :fooBar=${b}", "foo-bar=1 :fooBar=${b}", "placeholder=a :placeholder=${b}", "id=x :id=${y}",
    ":title=literal", ":items=${items}", ":n=${5}", ":obj=items", ":obj=${items}",
    "foo=1 foo=2", "foo ?foo", "?foo ?foo", "foo-bar fooBar",
    "__proto__=1 __proto__=2", ":__proto__=${a} :__proto__=${b}", "constructor=1 constructor=2",
    "title=\"${a} x\"", "label=${a b}", "class=#{local}",
    "w=100% h=${height}px", "x=\"\" y='' z=",
  ];
  const tags = ["div", "rtgl-view"];

  const inputs = tags.flatMap((tag) => attrStrings.map((attrsString) => ({
    label: `${tag} ${labelOf(attrsString)}`,
    input: { tag, attrsString },
  })));

  return compareOutcomes(
    inputs,
    ({ tag, attrsString }) => {
      const violation = checkGetNodeBindingViolation({ attrsString, tagName: tag, isWebComponent: tag.includes("-") });
      if (violation) {
        throw new Error(`[Parser] ${violation.message}`);
      }
      return {};
    },
    ({ tag, attrsString }) => {
      feParseNodeBindings({
        attrsString,
        viewData: {},
        tagName: tag,
        isWebComponent: tag.includes("-"),
      });
      return {};
    },
  );
};

// f: schema contract (FE validateSchemaContract throws vs any SCHEMA-* error from check)
const compareSchemaContract = async () => {
  const named = (extra = {}) => ({ componentName: "rtgl-case", ...extra });
  const schemaCases = [
    ["minimal", named()],
    ["props schema", named({ propsSchema: { type: "object", properties: { title: { type: "string" } } } })],
    ["missing componentName", { propsSchema: { type: "object" } }],
    ["componentName empty", { componentName: "" }],
    ["componentName blank", { componentName: "   " }],
    ["componentName number", { componentName: 5 }],
    ["componentName null", { componentName: null }],
    ["componentName list", { componentName: ["rtgl-case"] }],
    ["schema is a list", ["rtgl-case"]],
    ["schema is a string", "rtgl-case"],
    ["attrsSchema", named({ attrsSchema: { type: "object" } })],
    ["attrsSchema null", named({ attrsSchema: null })],
    ["ssr true", named({ ssr: true })],
    ["ssr false", named({ ssr: false })],
    ["ssr string yes", named({ ssr: "yes" })],
    ["ssr string false", named({ ssr: "false" })],
    ["ssr zero", named({ ssr: 0 })],
    ["ssr one", named({ ssr: 1 })],
    ["ssr null", named({ ssr: null })],
    ["ssr list", named({ ssr: [] })],
    ["ssr object", named({ ssr: {} })],
    ["methods null", named({ methods: null })],
    ["methods list", named({ methods: [] })],
    ["methods string", named({ methods: "open" })],
    ["methods empty object", named({ methods: {} })],
    ["methods type only", named({ methods: { type: "object" } })],
    ["methods type array", named({ methods: { type: "array", properties: {} } })],
    ["methods type string", named({ methods: { type: "string", properties: {} } })],
    ["methods properties list", named({ methods: { properties: [] } })],
    ["methods properties null", named({ methods: { properties: null } })],
    ["methods properties string", named({ methods: { properties: "open" } })],
    ["methods properties empty", named({ methods: { properties: {} } })],
    ["methods properties one", named({ methods: { properties: { open: { type: "object" } } } })],
    ["methods type object with property", named({ methods: { type: "object", properties: { open: {} } } })],
    ["methods two properties", named({ methods: { properties: { open: {}, close: {} } } })],
    ["events", named({ events: { tap: {} } })],
    ["events null", named({ events: null })],
    ["methods and events", named({ methods: { type: "object", properties: {} }, events: {} })],
    ["ssr and methods", named({ ssr: true, methods: { properties: { open: {} } } })],
    ["ssr bad and attrsSchema", named({ ssr: "no", attrsSchema: {} })],
  ];

  // Declared methods are exported from .methods.js so only the schema shape is under test.
  const methodNamesOf = (schema) => {
    const properties = schema?.methods?.properties;
    return properties && typeof properties === "object" && !Array.isArray(properties) ? Object.keys(properties) : [];
  };

  const cases = schemaCases.map(([label, schema], index) => {
    const name = caseName(index);
    const componentName = schema && typeof schema === "object" && !Array.isArray(schema) && typeof schema.componentName === "string"
      && schema.componentName.trim() !== ""
      ? { ...schema, componentName: `rtgl-${name}` }
      : schema;
    const methodNames = methodNamesOf(componentName);
    return {
      label,
      name,
      schema: componentName,
      methodNames,
      files: {
        "schema.yaml": dumpYaml(componentName),
        "view.yaml": "template:\n  - rtgl-view: text\n",
        ...(methodNames.length > 0
          ? { "methods.js": `${methodNames.map((methodName) => `export const ${methodName} = () => {};`).join("\n")}\n` }
          : {}),
      },
    };
  });

  const diagnosticsByCase = await analyzeCases(cases);
  const mismatches = [];
  cases.forEach(({ label, name, schema, methodNames }) => {
    const fe = outcomeOf(() => feValidateSchemaContract({ schema, methodExports: methodNames }));
    const schemaErrors = diagnosticsByCase.get(name)
      .filter((diagnostic) => diagnostic.code.startsWith("RTGL-CHECK-SCHEMA-") && diagnostic.severity === "error")
      .map((diagnostic) => diagnostic.code.replace("RTGL-CHECK-", ""));
    if ((fe.error !== undefined) !== (schemaErrors.length > 0)) {
      mismatches.push({
        input: label,
        check: schemaErrors.length > 0 ? `reports ${schemaErrors.join(", ")}` : "reports no SCHEMA error",
        fe: describeOutcome(fe),
      });
    }
  });
  return { inputCount: cases.length, mismatches };
};

// g: jempl control directives (JEMPL-003 in check vs how jempl itself parses the key)
const compareJemplDirectives = async () => {
  const body = [{ "rtgl-view": "text" }];
  const directives = [
    ["$if x", "if"],
    ["$if(x)", "if"],
    ["$if x == 1", "if"],
    ["$if !x", "if"],
    ["$if", "if"],
    ["$elif x", "elif"],
    ["$elif(x)", "elif"],
    ["$else", "elif"],
    ["$else if x", "elif"],
    ["$for item in items", "for"],
    ["$for item, i in items", "for"],
    ["$for(item in items)", "for"],
    ["$for(item, i in items)", "for"],
    ["$for:nested item in items", "for"],
    ["$for item of items", "for"],
    ["$for item in", "for"],
    ["$for", "for"],
    ["$each", "other"],
    ["$each item in items", "other"],
    ["$when", "other"],
    ["$when x", "other"],
    ["$unknown x", "other"],
    ["$", "other"],
  ];

  // $elif / $else only mean something as siblings of an $if in the same mapping.
  const templateFor = (directive, kind) => {
    return [kind === "elif" ? { "$if a": body, [directive]: body } : { [directive]: body }];
  };

  // jempl turns real directives into CONDITIONAL / LOOP nodes (or a `$when` condition); anything
  // else starting with "$" survives as a literal object key and is rendered as an element selector.
  const jemplRejects = (template) => {
    let ast;
    try {
      ast = parseJempl(template);
    } catch {
      return true;
    }
    const visit = (node) => {
      if (Array.isArray(node)) return node.some(visit);
      if (!node || typeof node !== "object") return false;
      if (node.type === NodeType.OBJECT && Array.isArray(node.properties)) {
        const literalDollarKey = node.properties.some(
          (property) => typeof property.key === "string" && property.key.startsWith("$")
            && property.value?.type !== NodeType.CONDITIONAL,
        );
        if (literalDollarKey) return true;
      }
      return Object.values(node).some(visit);
    };
    return visit(ast);
  };

  const cases = directives.map(([directive, kind], index) => {
    const name = caseName(index);
    return {
      label: directive,
      name,
      template: templateFor(directive, kind),
      files: {
        "schema.yaml": `componentName: rtgl-${name}\n`,
        "view.yaml": dumpYaml({ template: templateFor(directive, kind) }),
      },
    };
  });

  const diagnosticsByCase = await analyzeCases(cases);
  const mismatches = [];
  cases.forEach(({ label, name, template }) => {
    // JEMPL-003 is the directive grammar rule; JEMPL-001 is jempl failing to parse the key at all.
    const diagnostics = diagnosticsByCase.get(name);
    const checkRejects = hasCode(diagnostics, "RTGL-CHECK-JEMPL-001") || hasCode(diagnostics, "RTGL-CHECK-JEMPL-003");
    const feRejects = jemplRejects(template);
    if (checkRejects !== feRejects) {
      mismatches.push({
        input: label,
        check: checkRejects ? "reports JEMPL-001/003" : "reports no JEMPL-001/003",
        fe: feRejects ? "jempl treats it as a literal key (or fails to parse)" : "jempl treats it as a control directive",
      });
    }
  });
  return { inputCount: cases.length, mismatches };
};

// h: element ids vs refs. FE parseView throws where check should report REF-002.
const compareIdRefs = async () => {
  const noop = {};
  const views = [
    ["camel selector id", { submitButton: noop }, [{ "div#submitButton": "x" }]],
    ["kebab selector id", { submitButton: noop }, [{ "div#submit-button": "x" }]],
    ["unrelated kebab selector id", { submitButton: noop }, [{ "div#main-content": "x" }, { "div#submitButton": "y" }]],
    ["kebab id attribute", { submitButton: noop }, [{ "div id=main-content": "x" }]],
    ["quoted kebab id attribute", { submitButton: noop }, [{ "div id=\"main-content\"": "x" }]],
    ["camel id attribute", { submitButton: noop }, [{ "div id=submitButton": "x" }]],
    ["selector and attribute both camel", { submitButton: noop }, [{ "div#a id=b": "x" }]],
    ["kebab selector, camel attribute", { submitButton: noop }, [{ "div#my-a id=b": "x" }]],
    ["camel selector, kebab attribute", { submitButton: noop }, [{ "div#a id=my-b": "x" }]],
    ["kebab selector and attribute", { submitButton: noop }, [{ "div#my-a id=my-b": "x" }]],
    ["kebab id with class", { submitButton: noop }, [{ "div#my-id.btn": "x" }]],
    ["kebab id, class refs only", { ".btn": noop }, [{ "div#my-id.btn": "x" }]],
    ["kebab id, global refs only", { window: noop, document: noop }, [{ "div#my-id": "x" }]],
    ["kebab id, no refs", {}, [{ "div#my-id": "x" }]],
    ["wildcard ref, camel id", { "item*": noop }, [{ "div#item1": "x" }]],
    ["wildcard ref, kebab id", { "item*": noop }, [{ "div#item-1": "x" }]],
    ["hash ref key, camel id", { "#submitButton": noop }, [{ "div#submitButton": "x" }]],
    ["web component kebab id", { submitButton: noop }, [{ "rtgl-view#my-view": "x" }]],
    ["web component camel id", { submitButton: noop }, [{ "rtgl-button#submitButton": "x" }]],
    ["uppercase id", { submitButton: noop }, [{ "div#Submit": "x" }]],
    ["underscore id", { submitButton: noop }, [{ "div#my_id": "x" }]],
    ["digit-leading id", { submitButton: noop }, [{ "div#1abc": "x" }]],
    ["nested kebab id", { submitButton: noop }, [{ "div#wrapper": [{ "span#inner-item": "x" }] }]],
    ["kebab id in $if", { submitButton: noop }, [{ "$if flag": [{ "div#bad-id": "x" }] }], { flag: true }],
    ["kebab id in $for", { submitButton: noop }, [{ "$for x in xs": [{ "div#row-item": "x" }] }], { xs: [1] }],
    ["dynamic camel id", { "item*": noop }, [{ "$for x in xs": [{ "div#item${x}": "x" }] }], { xs: [1, 2] }],
  ];

  const cases = views.map(([label, refs, template], index) => {
    const name = caseName(index);
    return {
      label,
      name,
      refs,
      template,
      viewData: views[index][3] || {},
      files: {
        "schema.yaml": `componentName: rtgl-${name}\n`,
        "view.yaml": dumpYaml({ refs, template }),
      },
    };
  });

  const diagnosticsByCase = await analyzeCases(cases);
  const h = (tag, data, children) => ({ tag, data, children });
  const mismatches = [];
  cases.forEach(({ label, name, refs, template, viewData }) => {
    const fe = outcomeOf(() => {
      // FE hands parseView the parsed jempl template, never the raw YAML value.
      feParseView({ h, template: parseJempl(template), viewData, refs, handlers: {}, wireEventListeners: false });
      return {};
    });
    const checkFlags = hasCode(diagnosticsByCase.get(name), "RTGL-CHECK-REF-002");
    if ((fe.error !== undefined) !== checkFlags) {
      mismatches.push({
        input: label,
        check: checkFlags ? "reports REF-002" : "reports no REF-002",
        fe: describeOutcome(fe),
      });
    }
  });
  return { inputCount: cases.length, mismatches };
};

// ---------------------------------------------------------------------------
// runner
// ---------------------------------------------------------------------------

const SECTIONS = [
  { name: "refs", minInputs: 80, run: compareRefs },
  { name: "eventConfig", minInputs: 2000, run: compareEventConfig },
  { name: "bindingNames", minInputs: 200, run: compareBindingNames },
  { name: "propertyBindingSyntax", minInputs: 40, run: comparePropertyBindingSyntax },
  { name: "nodeBindings", minInputs: 120, run: compareNodeBindings },
  { name: "schemaContract", minInputs: 40, run: compareSchemaContract },
  { name: "jemplDirectives", minInputs: 20, run: compareJemplDirectives },
  { name: "idRefs", minInputs: 20, run: compareIdRefs },
];

const failures = [];

for (const section of SECTIONS) {
  const { inputCount, mismatches } = await section.run();
  const known = KNOWN_DRIFT[section.name];
  const expectedCount = known ? known.count : 0;
  const status = mismatches.length === expectedCount ? "ok" : "FAIL";
  console.log(
    `${status} ${section.name}: ${inputCount} inputs, ${mismatches.length} mismatches (known: ${expectedCount})`
    + `${known ? ` [${known.findings.join(", ")}]` : ""}`,
  );

  if (inputCount < section.minInputs) {
    failures.push(`${section.name}: only ${inputCount} inputs ran, expected at least ${section.minInputs}.`);
  }
  if (mismatches.length !== expectedCount) {
    const lines = mismatches.slice(0, 40).map(
      (mismatch) => `    - ${mismatch.input}\n        check: ${mismatch.check}\n        fe:    ${mismatch.fe}`,
    );
    failures.push(
      `${section.name}: ${mismatches.length} mismatches, KNOWN_DRIFT records ${expectedCount}. `
      + `Update KNOWN_DRIFT.${section.name} only if the change is intended.\n${lines.join("\n")}`
      + `${mismatches.length > 40 ? `\n    ... and ${mismatches.length - 40} more` : ""}`,
    );
  }
}

Object.keys(KNOWN_DRIFT).forEach((sectionName) => {
  if (!SECTIONS.some((section) => section.name === sectionName)) {
    failures.push(`KNOWN_DRIFT has an entry for unknown section '${sectionName}'.`);
  }
});

if (failures.length > 0) {
  console.error(`\nFE parity failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log("FE parity contract pass.");
