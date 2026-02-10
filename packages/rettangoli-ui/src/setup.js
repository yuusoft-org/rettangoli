import createGlobalUI from './deps/createGlobalUI';

const globalUI = createGlobalUI();

const componentDependencies = {
  globalUI: globalUI
}

const deps = {
  components: componentDependencies,
}

export {
  deps,
}
