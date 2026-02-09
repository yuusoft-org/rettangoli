import { createVirtualDom } from "../src/parser.js";

const createH = () => (tag, data = {}, children = []) => ({
  tag,
  data,
  children,
});

export const runParserCoreErrorContract = ({
  scenario,
}) => {
  if (scenario === "non_array_input") {
    try {
      createVirtualDom({
        h: createH(),
        items: "not an array",
        refs: {},
        handlers: {},
        viewData: {},
      });
      return { threw: false };
    } catch (e) {
      return { threw: true, messageContains: e.message.includes("must be an array") };
    }
  }

  throw new Error(`Unknown parser error scenario '${scenario}'.`);
};

export const runParserCoreContract = ({
  item,
  includeHookFactory = true,
}) => {
  let hookFactoryCalls = 0;
  const hookFactory = includeHookFactory
    ? () => {
      hookFactoryCalls += 1;
      return {
        update: () => {},
      };
    }
    : undefined;

  const nodes = createVirtualDom({
    h: createH(),
    items: [item],
    refs: {},
    handlers: {},
    viewData: {},
    createComponentUpdateHook: hookFactory,
  });

  const node = nodes[0];
  return {
    hookFactoryCalls,
    hasHook: !!node?.data?.hook,
    hasUpdateFn: typeof node?.data?.hook?.update === "function",
  };
};
