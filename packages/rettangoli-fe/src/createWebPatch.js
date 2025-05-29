import { init } from 'snabbdom/build/init.js'
import { classModule } from 'snabbdom/build/modules/class.js'
import { propsModule } from 'snabbdom/build/modules/props.js'
import { attributesModule } from 'snabbdom/build/modules/attributes.js'
import { styleModule } from 'snabbdom/build/modules/style.js'
import { eventListenersModule } from 'snabbdom/build/modules/eventlisteners.js'

const createWebPatch = () => {
  return init([
    classModule,
    propsModule,
    attributesModule,
    styleModule,
    eventListenersModule,
  ]);
};

export default createWebPatch;
