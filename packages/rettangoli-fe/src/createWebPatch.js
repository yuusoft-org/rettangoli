import { init } from 'snabbdom/build/init.js'
import { classModule } from 'snabbdom/build/modules/class.js'
import { propsModule } from 'snabbdom/build/modules/props.js'
import { attributesModule } from 'snabbdom/build/modules/attributes.js'
// Vendored rather than imported from snabbdom: the published style module
// dereferences a bare `window` at module scope, which makes importing this
// package throw in Node. See the file header for the two-line delta.
import { styleModule } from './web/vendor/snabbdomStyleModule.js'
import { eventListenersModule } from 'snabbdom/build/modules/eventlisteners.js'

const isCustomElementVnode = (vnode) =>
  typeof vnode.sel === 'string' && vnode.sel.split(/[.#]/)[0].includes('-')

// A custom element that isn't defined yet is a plain HTMLElement, so
// assigning a prop named like a native property (`title`, `hidden`, `lang`)
// would run the native setter: the value is coerced and reflected as an
// attribute. Keep it as an own property instead, which the component reads
// when it upgrades (installReactiveProps). Hydration meets this on every
// child, since a page with prerendered markup defines parents first.
const isUndefinedCustomElement = (elm) =>
  typeof globalThis.customElements?.get === 'function' &&
  typeof elm?.localName === 'string' &&
  !globalThis.customElements.get(elm.localName)

const keepPropsOnUndefinedElement = (oldVnode, vnode) => {
  const elm = vnode.elm
  const oldProps = oldVnode.data?.props || {}
  const props = vnode.data?.props || {}
  for (const key of Object.keys(props)) {
    if (oldProps[key] !== props[key] || !Object.hasOwn(elm, key)) {
      Object.defineProperty(elm, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: props[key],
      })
    }
  }
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
  return init([
    classModule,
    componentPropsModule,
    attributesModule,
    styleModule,
    eventListenersModule,
  ]);
};

export default createWebPatch;
