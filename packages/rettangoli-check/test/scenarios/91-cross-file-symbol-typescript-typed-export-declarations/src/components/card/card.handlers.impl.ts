export type HandlerFn = () => void;
const handlerBag: { onTap: HandlerFn } = { onTap: () => {} };
export const { onTap: handleTap }: { onTap: HandlerFn } = handlerBag;
