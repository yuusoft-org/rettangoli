#!/usr/bin/env node

import { parseYamlSafe, collectTemplateAstFromView } from "../src/core/parsers.js";
import { buildComponentScopeGraph, resolveExpressionPathType } from "../src/core/scopeGraph.js";

const failures = [];

const normalizeWhitespace = (value = "") => {
  return String(value).replace(/\s+/gu, " ").trim();
};

const createModel = ({
  componentKey,
  viewText,
  viewYaml,
  schemaProperties,
  refListeners,
}) => {
  return {
    componentKey,
    view: {
      filePath: `${componentKey}.view.yaml`,
      text: viewText,
      yaml: viewYaml,
      templateAst: collectTemplateAstFromView({
        viewText,
        viewYaml,
      }),
      refListeners,
    },
    schema: {
      yaml: {
        propsSchema: {
          type: "object",
          properties: schemaProperties,
        },
      },
    },
    constants: {
      yaml: null,
    },
    store: {
      filePath: `${componentKey}.store.js`,
      sourceText: "",
      exports: new Set(),
    },
    handlers: {
      exports: new Set(),
    },
    methods: {
      exports: new Set(),
    },
  };
};

const buildFixtureGraph = ({
  fixtureId,
  componentKey,
  viewText,
  schemaProperties,
  refListenersFactory,
}) => {
  const yamlResult = parseYamlSafe({
    text: viewText,
    filePath: `${componentKey}.view.yaml`,
  });

  if (!yamlResult.ok) {
    failures.push(`${fixtureId}: failed to parse fixture YAML: ${yamlResult.error?.message || "unknown parse error"}`);
    return null;
  }

  const model = createModel({
    componentKey,
    viewText,
    viewYaml: yamlResult.value,
    schemaProperties,
    refListeners: refListenersFactory(yamlResult.value),
  });

  return {
    viewText,
    model,
    graph: buildComponentScopeGraph(model),
  };
};

const findReferences = ({ graph, expression, context, source }) => {
  return graph.references.filter((reference) => (
    reference?.expression === expression
    && reference?.context === context
    && reference?.source === source
  ));
};

const findReference = ({ graph, expression, context, source }) => {
  return findReferences({ graph, expression, context, source })[0];
};

const assertRangeShape = ({
  label,
  reference,
  viewText,
  allowWhitespaceNormalizedMatch = false,
}) => {
  if (!reference) {
    failures.push(`${label}: missing reference`);
    return;
  }

  const range = reference.range || {};
  ["line", "column", "endLine", "endColumn", "offset", "endOffset", "length"].forEach((field) => {
    if (!Number.isInteger(range[field])) {
      failures.push(`${label}: missing integer range.${field}`);
    }
    if (!Number.isInteger(reference[field])) {
      failures.push(`${label}: missing integer top-level ${field}`);
    }
  });
  if (Number.isInteger(range.endOffset) && Number.isInteger(range.offset) && range.endOffset <= range.offset) {
    failures.push(`${label}: expected endOffset > offset`);
  }
  if (Number.isInteger(range.length) && range.length <= 0) {
    failures.push(`${label}: expected positive length`);
  }
  if (Number.isInteger(range.offset) && Number.isInteger(range.endOffset)) {
    const actualSlice = viewText.slice(range.offset, range.endOffset);
    const exactMatch = actualSlice === reference.expression;
    const normalizedMatch = normalizeWhitespace(actualSlice) === normalizeWhitespace(reference.expression);
    if (!exactMatch && !(allowWhitespaceNormalizedMatch && normalizedMatch)) {
      failures.push(
        `${label}: range slice '${actualSlice}' does not match expression '${reference.expression}'`,
      );
    }
  }
};

const assertNodeRangeSlice = ({
  label,
  node,
  viewText,
  expectedSlice,
  allowWhitespaceNormalizedMatch = false,
}) => {
  if (!node || typeof node !== "object") {
    failures.push(`${label}: missing AST node`);
    return;
  }

  const range = node.range || {};
  if (!Number.isInteger(range.offset) || !Number.isInteger(range.endOffset)) {
    failures.push(`${label}: missing AST node offsets`);
    return;
  }

  const actualSlice = viewText.slice(range.offset, range.endOffset);
  const exactMatch = actualSlice === expectedSlice;
  const normalizedMatch = normalizeWhitespace(actualSlice) === normalizeWhitespace(expectedSlice);
  if (!exactMatch && !(allowWhitespaceNormalizedMatch && normalizedMatch)) {
    failures.push(`${label}: expected AST slice '${expectedSlice}', got '${actualSlice}'`);
  }
};

const baselineFixture = buildFixtureGraph({
  fixtureId: "baseline",
  componentKey: "card",
  viewText: [
    "template:",
    "  - $if !isVisible && count > 0:",
    "      - $for item, idx in items:",
    "          - rtgl-view :title=${item.name}: null",
    "  - rtgl-view :title=${item.name}: null",
    "refs:",
    "  card:",
    "    eventListeners:",
    "      click:",
    "        payload: \"!isVisible && count > 0\"",
  ].join("\n"),
  schemaProperties: {
    count: { type: "number" },
    isVisible: { type: "boolean" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
    },
  },
  refListenersFactory: () => ([
    {
      line: 10,
      optionLines: {
        payload: 10,
      },
      eventConfig: {
        payload: "!isVisible && count > 0",
      },
    },
  ]),
});

if (baselineFixture) {
  const { graph, viewText } = baselineFixture;

  const conditionReference = findReference({
    graph,
    expression: "!isVisible && count > 0",
    context: "condition",
    source: "jempl-condition",
  });
  assertRangeShape({
    label: "baseline/condition-reference",
    reference: conditionReference,
    viewText,
  });
  if (conditionReference?.expressionAst?.range?.line !== conditionReference?.line) {
    failures.push("baseline/condition-reference: expressionAst root range is not propagated");
  }
  const conditionLeft = conditionReference?.expressionAst?.left;
  const conditionRight = conditionReference?.expressionAst?.right;
  assertNodeRangeSlice({
    label: "baseline/condition-reference-root",
    node: conditionReference?.expressionAst,
    viewText,
    expectedSlice: "!isVisible && count > 0",
  });
  assertNodeRangeSlice({
    label: "baseline/condition-reference-left",
    node: conditionLeft,
    viewText,
    expectedSlice: "!isVisible",
  });
  assertNodeRangeSlice({
    label: "baseline/condition-reference-left-operand",
    node: conditionLeft?.operand,
    viewText,
    expectedSlice: "isVisible",
  });
  assertNodeRangeSlice({
    label: "baseline/condition-reference-right",
    node: conditionRight,
    viewText,
    expectedSlice: "count > 0",
  });
  assertNodeRangeSlice({
    label: "baseline/condition-reference-right-left",
    node: conditionRight?.left,
    viewText,
    expectedSlice: "count",
  });
  assertNodeRangeSlice({
    label: "baseline/condition-reference-right-right",
    node: conditionRight?.right,
    viewText,
    expectedSlice: "0",
  });

  const loopIterableReference = findReference({
    graph,
    expression: "items",
    context: "loop-iterable",
    source: "jempl-loop",
  });
  assertRangeShape({
    label: "baseline/loop-iterable-reference",
    reference: loopIterableReference,
    viewText,
  });
  assertNodeRangeSlice({
    label: "baseline/loop-iterable-reference-root",
    node: loopIterableReference?.expressionAst,
    viewText,
    expectedSlice: "items",
  });

  const attrReferences = findReferences({
    graph,
    expression: "item.name",
    context: "attr-prop",
    source: "template-attr",
  });
  if (attrReferences.length !== 2) {
    failures.push(`baseline/attribute-reference: expected 2 item.name references, got ${attrReferences.length}`);
  }
  attrReferences.forEach((reference, index) => {
    assertRangeShape({
      label: `baseline/attribute-reference-${index + 1}`,
      reference,
      viewText,
    });
  });
  const loopScopedAttrReference = attrReferences.find((reference) => reference?.localSymbols?.has("item"));
  if (!loopScopedAttrReference) {
    failures.push("baseline/attribute-reference: expected loop-scoped item.name reference");
  }
  const leakedLoopSymbolReference = attrReferences.find((reference) => !reference?.localSymbols?.has("item"));
  if (!leakedLoopSymbolReference) {
    failures.push("baseline/attribute-reference: expected non-loop-scoped item.name reference");
  }

  const listenerReference = findReference({
    graph,
    expression: "!isVisible && count > 0",
    context: "listener-payload",
    source: "listener",
  });
  assertRangeShape({
    label: "baseline/listener-reference",
    reference: listenerReference,
    viewText,
  });
  if (listenerReference?.line !== 10) {
    failures.push(`baseline/listener-reference: expected line 10, got ${listenerReference?.line}`);
  }
  assertNodeRangeSlice({
    label: "baseline/listener-reference-root",
    node: listenerReference?.expressionAst,
    viewText,
    expectedSlice: "!isVisible && count > 0",
  });
  assertNodeRangeSlice({
    label: "baseline/listener-reference-left",
    node: listenerReference?.expressionAst?.left,
    viewText,
    expectedSlice: "!isVisible",
  });
  assertNodeRangeSlice({
    label: "baseline/listener-reference-right-right",
    node: listenerReference?.expressionAst?.right?.right,
    viewText,
    expectedSlice: "0",
  });
}

const multilineFixture = buildFixtureGraph({
  fixtureId: "multiline",
  componentKey: "multi",
  viewText: [
    "template:",
    "  - ? >",
    "      $if !isVisible",
    "      && count > 0",
    "    :",
    "      - rtgl-view :title=${count}: null",
    "refs:",
    "  card:",
    "    eventListeners:",
    "      click:",
    "        payload: >",
    "          !isVisible",
    "          && count > 0",
  ].join("\n"),
  schemaProperties: {
    count: { type: "number" },
    isVisible: { type: "boolean" },
  },
  refListenersFactory: (viewYaml) => ([
    {
      line: 10,
      optionLines: {
        payload: 11,
      },
      eventConfig: {
        payload: viewYaml?.refs?.card?.eventListeners?.click?.payload,
      },
    },
  ]),
});

if (multilineFixture) {
  const { graph, viewText } = multilineFixture;

  const conditionReference = findReference({
    graph,
    expression: "!isVisible && count > 0",
    context: "condition",
    source: "jempl-condition",
  });
  assertRangeShape({
    label: "multiline/condition-reference",
    reference: conditionReference,
    viewText,
    allowWhitespaceNormalizedMatch: true,
  });
  if (conditionReference?.line !== 3) {
    failures.push(`multiline/condition-reference: expected line 3, got ${conditionReference?.line}`);
  }
  assertNodeRangeSlice({
    label: "multiline/condition-reference-root",
    node: conditionReference?.expressionAst,
    viewText,
    expectedSlice: "!isVisible && count > 0",
    allowWhitespaceNormalizedMatch: true,
  });
  assertNodeRangeSlice({
    label: "multiline/condition-reference-left",
    node: conditionReference?.expressionAst?.left,
    viewText,
    expectedSlice: "!isVisible",
  });
  assertNodeRangeSlice({
    label: "multiline/condition-reference-right",
    node: conditionReference?.expressionAst?.right,
    viewText,
    expectedSlice: "count > 0",
  });

  const listenerReference = findReference({
    graph,
    expression: "!isVisible && count > 0",
    context: "listener-payload",
    source: "listener",
  });
  assertRangeShape({
    label: "multiline/listener-reference",
    reference: listenerReference,
    viewText,
    allowWhitespaceNormalizedMatch: true,
  });
  if (listenerReference?.line !== 12) {
    failures.push(`multiline/listener-reference: expected line 12, got ${listenerReference?.line}`);
  }
  assertNodeRangeSlice({
    label: "multiline/listener-reference-root",
    node: listenerReference?.expressionAst,
    viewText,
    expectedSlice: "!isVisible && count > 0",
    allowWhitespaceNormalizedMatch: true,
  });
  assertNodeRangeSlice({
    label: "multiline/listener-reference-left",
    node: listenerReference?.expressionAst?.left,
    viewText,
    expectedSlice: "!isVisible",
  });
  assertNodeRangeSlice({
    label: "multiline/listener-reference-right",
    node: listenerReference?.expressionAst?.right,
    viewText,
    expectedSlice: "count > 0",
  });
}

const precedenceFixture = buildFixtureGraph({
  fixtureId: "precedence",
  componentKey: "precedence",
  viewText: [
    "template:",
    "  - \"$if count == 0 || !isVisible && hasAccess\":",
    "      rtgl-text: ${count}",
  ].join("\n"),
  schemaProperties: {
    count: { type: "number" },
    isVisible: { type: "boolean" },
    hasAccess: { type: "boolean" },
  },
  refListenersFactory: () => [],
});

if (precedenceFixture) {
  const { graph, viewText } = precedenceFixture;
  const conditionReference = findReference({
    graph,
    expression: "count == 0 || !isVisible && hasAccess",
    context: "condition",
    source: "jempl-condition",
  });
  assertRangeShape({
    label: "precedence/condition-reference",
    reference: conditionReference,
    viewText,
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-root",
    node: conditionReference?.expressionAst,
    viewText,
    expectedSlice: "count == 0 || !isVisible && hasAccess",
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-left",
    node: conditionReference?.expressionAst?.left,
    viewText,
    expectedSlice: "count == 0",
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-left-left",
    node: conditionReference?.expressionAst?.left?.left,
    viewText,
    expectedSlice: "count",
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-left-right",
    node: conditionReference?.expressionAst?.left?.right,
    viewText,
    expectedSlice: "0",
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-right",
    node: conditionReference?.expressionAst?.right,
    viewText,
    expectedSlice: "!isVisible && hasAccess",
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-right-left",
    node: conditionReference?.expressionAst?.right?.left,
    viewText,
    expectedSlice: "!isVisible",
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-right-left-operand",
    node: conditionReference?.expressionAst?.right?.left?.operand,
    viewText,
    expectedSlice: "isVisible",
  });
  assertNodeRangeSlice({
    label: "precedence/condition-reference-right-right",
    node: conditionReference?.expressionAst?.right?.right,
    viewText,
    expectedSlice: "hasAccess",
  });
}

const nestedShadowFixture = buildFixtureGraph({
  fixtureId: "nested-shadowing",
  componentKey: "shadow",
  viewText: [
    "template:",
    "  - $for item in sections:",
    "      - $if item.enabled:",
    "          - $for item in item.entries:",
    "              - rtgl-view :title=${item.name}: null",
  ].join("\n"),
  schemaProperties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          entries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  refListenersFactory: () => [],
});

if (nestedShadowFixture) {
  const { graph, model, viewText } = nestedShadowFixture;
  const shadowedReference = findReference({
    graph,
    expression: "item.name",
    context: "attr-prop",
    source: "template-attr",
  });
  assertRangeShape({
    label: "nested-shadowing/attribute-reference",
    reference: shadowedReference,
    viewText,
  });

  const resolvedType = resolveExpressionPathType({
    model,
    expression: "item.name",
    localSchemaTypes: shadowedReference?.localSchemaTypes,
  });
  if (!resolvedType?.resolved || resolvedType.resolved.type !== "string") {
    failures.push("nested-shadowing/attribute-reference: expected item.name to resolve to inner loop item type");
  }
}

if (failures.length > 0) {
  console.error("Scope graph range contract failures:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Scope graph range contract pass.");
