import { createRefMatchers, resolveBestRefMatcher } from "../view/refs.js";

export const createRuntimeRefMatchers = (refs) => createRefMatchers(refs);

const getVNodeClassNames = (vNode) => {
  const classNames = [];

  const classObject = vNode?.data?.class;
  if (classObject && typeof classObject === "object") {
    Object.entries(classObject).forEach(([className, enabled]) => {
      if (enabled) {
        classNames.push(className);
      }
    });
  }

  const classAttr = vNode?.data?.attrs?.class;
  if (typeof classAttr === "string") {
    classAttr
      .split(/\s+/)
      .filter(Boolean)
      .forEach((className) => classNames.push(className));
  }

  return [...new Set(classNames)];
};

export const matchesConfiguredRef = ({ id, classNames = [], refMatchers }) => {
  if (refMatchers.length === 0) {
    return false;
  }

  return Boolean(resolveBestRefMatcher({
    elementIdForRefs: id,
    classNames,
    refMatchers,
  }));
};

export const collectRefElements = ({ rootVNode, refs }) => {
  const ids = {};
  const refMatchers = createRuntimeRefMatchers(refs);

  const findRefElements = (vNode) => {
    if (!vNode || typeof vNode !== "object") {
      return;
    }

    const id = vNode?.data?.attrs?.id;
    const classNames = getVNodeClassNames(vNode);
    const bestMatchRef = resolveBestRefMatcher({
      elementIdForRefs: id,
      classNames,
      refMatchers,
    });

    if (vNode.elm && bestMatchRef) {
      const key = id || bestMatchRef.refKey;
      ids[key] = vNode.elm;
    }

    if (Array.isArray(vNode.children)) {
      vNode.children.forEach(findRefElements);
    }
  };

  findRefElements(rootVNode);

  return ids;
};
