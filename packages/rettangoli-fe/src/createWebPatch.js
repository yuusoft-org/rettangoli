import { init } from 'snabbdom/build/init.js'
import { classModule } from 'snabbdom/build/modules/class.js'
import { propsModule } from 'snabbdom/build/modules/props.js'
import { attributesModule } from 'snabbdom/build/modules/attributes.js'
// Vendored rather than imported from snabbdom: the published style module
// dereferences a bare `window` at module scope, which makes importing this
// package throw in Node. See the file header for the two-line delta.
import { styleModule } from './web/vendor/snabbdomStyleModule.js'
import { eventListenersModule } from 'snabbdom/build/modules/eventlisteners.js'
import { toCamelCase } from './core/runtime/props.js'

const isCustomElementVnode = (vnode) =>
  typeof vnode.sel === 'string' && vnode.sel.split(/[.#]/)[0].includes('-')

// The old vnodes of hydrating first patches (web/hydration.js), and how many
// of those patches are running. A child component renders inside its
// parent's patch, so they can nest.
const hydratingRoots = new WeakSet()
let hydratingPatches = 0

export const markHydratingPatch = (oldVnode) => {
  hydratingRoots.add(oldVnode)
  return oldVnode
}

// On a page with prerendered markup, parents are defined first, so a child
// component is still a plain HTMLElement when its parent's patch assigns its
// props. A prop named like a native property (`title`, `hidden`, `lang`)
// would then run the native setter: the value is coerced and reflected as
// an attribute. During a hydrating patch it is kept as an own property
// instead, which the component reads when it upgrades (installReactiveProps)
// or hands to the native setter if it doesn't declare it
// (releaseNativeProps). A prop written in attribute form (`title=Hi`) is
// already an attribute and keeps the native setter, and outside hydration
// every prop is assigned as before.
const isUndefinedCustomElement = (elm) =>
  typeof globalThis.customElements?.get === 'function' &&
  typeof elm?.localName === 'string' &&
  !globalThis.customElements.get(elm.localName)

const keepPropsOnUndefinedElement = (oldVnode, vnode) => {
  const elm = vnode.elm
  const oldProps = oldVnode.data?.props || {}
  const props = vnode.data?.props || {}
  const attributeForm = new Set(Object.keys(vnode.data?.attrs || {}).map(toCamelCase))
  const nativeOld = {}
  const nativeProps = {}
  for (const key of Object.keys(props)) {
    const keep = !attributeForm.has(key) && (hydratingPatches > 0 || Object.hasOwn(elm, key))
    if (!keep) {
      if (Object.hasOwn(oldProps, key)) nativeOld[key] = oldProps[key]
      nativeProps[key] = props[key]
      continue
    }
    if (oldProps[key] !== props[key] || !Object.hasOwn(elm, key)) {
      Object.defineProperty(elm, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: props[key],
      })
    }
  }
  propsModule.update({ data: { props: nativeOld } }, { elm, data: { props: nativeProps } })
}

const updateComponentProps = (oldVnode, vnode) => {
  if (isCustomElementVnode(vnode) && isUndefinedCustomElement(vnode.elm)) {
    keepPropsOnUndefinedElement(oldVnode, vnode)
    return
  }
  propsModule.update(oldVnode, vnode)
}

const componentPropsModule = {
  create: updateComponentProps,
  update(oldVnode, vnode) {
    if (isCustomElementVnode(vnode)) {
      const nextProps = vnode.data?.props || {};
      for (const key of Object.keys(oldVnode.data?.props || {})) {
        if (!Object.hasOwn(nextProps, key)) {
          // Reset through the setter so attribute fallback and reactivity survive.
          vnode.elm[key] = undefined;
        }
      }
    }
    updateComponentProps(oldVnode, vnode);
  },
};

const createWebPatch = () => {
  const patch = init([
    classModule,
    componentPropsModule,
    attributesModule,
    styleModule,
    eventListenersModule,
  ]);
  return (oldVnode, vnode) => {
    if (!hydratingRoots.has(oldVnode)) {
      return patch(oldVnode, vnode);
    }
    hydratingPatches += 1;
    try {
      return patch(oldVnode, vnode);
    } finally {
      hydratingPatches -= 1;
    }
  };
};

export default createWebPatch;
