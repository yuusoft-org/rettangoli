import { createWebPatch } from '@rettangoli/fe';
import createGlobalUI from './deps/createGlobalUI';
import { h } from 'snabbdom/build/h';

const globalUI = createGlobalUI();

const componentDependencies = {
  globalUI: globalUI
}

const deps = {
  components: componentDependencies,
}

const patch = createWebPatch();

export {
  h,
  patch,
  deps,
}