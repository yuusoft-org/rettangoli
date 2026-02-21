const createElementProxy = (vnode) => {
  return {
    tagName: vnode.sel,
    attrs: vnode.data?.attrs || {},
    props: vnode.data?.props || {},
    textContent: vnode.text || "",
    addEventListener() {},
    removeEventListener() {},
    toString() {
      return vnode.text || "";
    },
  };
};

const annotateVNode = (vnode) => {
  if (!vnode || typeof vnode !== "object") {
    return vnode;
  }

  vnode.elm = createElementProxy(vnode);

  if (Array.isArray(vnode.children)) {
    vnode.children = vnode.children.map((child) => annotateVNode(child));
  }

  return vnode;
};

const createTuiPatch = () => {
  return (_oldVNode, newVNode) => {
    return annotateVNode(newVNode);
  };
};

export default createTuiPatch;
