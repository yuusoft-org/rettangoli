import { createVirtualDom } from "../src/parser.js";

const createH = () => (tag, data = {}, children = []) => ({
  tag,
  data,
  children,
});

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
