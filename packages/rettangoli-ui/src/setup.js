import { createWebPatch } from '@rettangoli/fe';
import { h } from 'snabbdom/build/h';

const componentDependencies = {}

const deps = {
  components: componentDependencies,
}

const patch = createWebPatch();

export {
  h,
  patch,
  deps,
}