import { scheduleFrame } from "./scheduler.js";

export const createWebComponentUpdateHook = ({
  scheduleFrameFn = scheduleFrame,
} = {}) => {
  return {
    update: (oldVnode, vnode) => {
      const oldProps = oldVnode.data?.props || {};
      const newProps = vnode.data?.props || {};

      const propsChanged = JSON.stringify(oldProps) !== JSON.stringify(newProps);
      if (!propsChanged) {
        return;
      }

      const element = vnode.elm;
      if (!element || typeof element.render !== "function") {
        return;
      }

      element.setAttribute("isDirty", "true");
      scheduleFrameFn(() => {
        element.render();
        element.removeAttribute("isDirty");

        if (element.handlers && element.handlers.handleOnUpdate) {
          const deps = {
            ...(element.deps),
            store: element.store,
            render: element.render.bind(element),
            handlers: element.handlers,
            dispatchEvent: element.dispatchEvent.bind(element),
            refs: element.refIds || {},
          };
          element.handlers.handleOnUpdate(deps, {
            oldProps,
            newProps,
          });
        }
      });
    },
  };
};
