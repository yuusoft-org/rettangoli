import { init } from 'snabbdom/build/init.js'
import { classModule } from 'snabbdom/build/modules/class.js'
import { propsModule } from 'snabbdom/build/modules/props.js'
import { attributesModule } from 'snabbdom/build/modules/attributes.js'
// Vendored rather than imported from snabbdom: the published style module
// dereferences a bare `window` at module scope, which makes importing this
// package throw in Node. See the file header for the two-line delta.
import { styleModule } from './web/vendor/snabbdomStyleModule.js'
import { eventListenersModule } from 'snabbdom/build/modules/eventlisteners.js'

const componentPropsModule = {
  create: propsModule.create,
  update(oldVnode, vnode) {
    if (typeof vnode.sel === 'string' && vnode.sel.split(/[.#]/)[0].includes('-')) {
      const nextProps = vnode.data?.props || {};
      for (const key of Object.keys(oldVnode.data?.props || {})) {
        if (!Object.hasOwn(nextProps, key)) {
          // Reset through the setter so attribute fallback and reactivity survive.
          vnode.elm[key] = undefined;
        }
      }
    }
    propsModule.update(oldVnode, vnode);
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
