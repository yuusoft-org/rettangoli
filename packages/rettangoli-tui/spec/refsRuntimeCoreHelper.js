import {
  collectRefElements,
  createRuntimeRefMatchers,
  matchesConfiguredRef,
} from "../src/core/runtime/refs.js";

export const runRefsRuntimeCoreCase = ({ scenario }) => {
  if (scenario === "matches_exact_and_wildcard") {
    const refMatchers = createRuntimeRefMatchers({
      submitButton: {},
      "todo*": {},
      ".label": {},
    });

    return {
      submitButton: matchesConfiguredRef({ id: "submitButton", refMatchers }),
      todo1: matchesConfiguredRef({ id: "todo1", refMatchers }),
      label: matchesConfiguredRef({ classNames: ["label"], refMatchers }),
      other: matchesConfiguredRef({ id: "other", classNames: ["x"], refMatchers }),
    };
  }

  if (scenario === "collects_matching_ref_elements") {
    const vnode = {
      data: { attrs: { id: "root" } },
      elm: { name: "root" },
      children: [
        {
          data: { attrs: { id: "submitButton" } },
          elm: { name: "submitButton" },
          children: [],
        },
        {
          data: { attrs: { id: "todo1" } },
          elm: { name: "todo1" },
          children: [
            {
              data: { attrs: { id: "todo2" } },
              elm: { name: "todo2" },
              children: [],
            },
          ],
        },
        {
          data: {
            attrs: {},
            class: {
              label: true,
            },
          },
          elm: { name: "label-node" },
          children: [],
        },
      ],
    };

    const refs = {
      submitButton: {},
      "todo*": {},
      ".label": {},
    };

    const ids = collectRefElements({
      rootVNode: vnode,
      refs,
    });

    return {
      submitName: ids.submitButton?.name,
      todo1Name: ids.todo1?.name,
      todo2Name: ids.todo2?.name,
      labelName: ids[".label"]?.name,
      rootExists: Object.prototype.hasOwnProperty.call(ids, "root"),
    };
  }

  if (scenario === "last_duplicate_id_wins") {
    const vnode = {
      data: { attrs: {} },
      elm: null,
      children: [
        {
          data: { attrs: { id: "submitButton" } },
          elm: { name: "first" },
          children: [],
        },
        {
          data: { attrs: { id: "submitButton" } },
          elm: { name: "second" },
          children: [],
        },
      ],
    };

    const ids = collectRefElements({
      rootVNode: vnode,
      refs: { submitButton: {} },
    });

    return {
      submitName: ids.submitButton?.name,
    };
  }

  throw new Error(`Unknown refs runtime core scenario '${scenario}'.`);
};
