export type ActionFn = (ctx: unknown) => unknown;
const actionTuple: [ActionFn] = [({ state }: any) => state];
export const [setCount]: [ActionFn] = actionTuple;
