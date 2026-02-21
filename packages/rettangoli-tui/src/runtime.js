import { createDefaultTuiPrimitives } from "./primitives/index.js";
import { createKeyboardEvent, splitInputSequences } from "./tui/keyboard.js";
import { openInExternalEditor } from "./tui/externalEditor.js";
import { createTerminalSession } from "./tui/terminalSession.js";

const createRendererComponents = (customComponents = {}) => {
  return {
    ...createDefaultTuiPrimitives(),
    ...customComponents,
  };
};

const shouldQuitFromKeyEvent = ({ keyEvent, quitNames }) => {
  if (!keyEvent) {
    return false;
  }

  if (keyEvent.ctrlKey && keyEvent.name === "c") {
    return true;
  }

  return quitNames.has(String(keyEvent.name || "").toLowerCase());
};

const resolveQuitNames = (quitKeys = ["q"]) => {
  return new Set(
    quitKeys
      .map((key) => String(key || "").toLowerCase())
      .filter(Boolean),
  );
};

export const createTuiRuntime = ({
  componentRegistry = {},
  components = {},
} = {}) => {
  const componentMap = new Map(Object.entries(componentRegistry));
  const rendererComponents = createRendererComponents(components);

  const registerComponent = (componentName, ComponentClass) => {
    componentMap.set(componentName, ComponentClass);
  };

  const instantiateComponent = ({ componentName, attributes = {}, props = {} }) => {
    const ComponentClass = componentMap.get(componentName);
    if (!ComponentClass) {
      throw new Error(`[TUI Runtime] Component '${componentName}' is not registered.`);
    }

    const bootstrapAttributes = { ...attributes };
    const bootstrapProps = { ...props };
    ComponentClass.__rtglBootstrapAttributes = bootstrapAttributes;
    ComponentClass.__rtglBootstrapProps = bootstrapProps;

    let instance;
    try {
      instance = new ComponentClass();
    } finally {
      delete ComponentClass.__rtglBootstrapAttributes;
      delete ComponentClass.__rtglBootstrapProps;
    }

    instance.deps = {
      ...(instance.deps || {}),
      components: {
        ...rendererComponents,
        ...(instance.deps?.components || {}),
      },
    };

    Object.entries(attributes).forEach(([name, value]) => {
      instance.setAttribute(name, value);
    });

    Object.entries(props).forEach(([name, value]) => {
      instance[name] = value;
    });

    return instance;
  };

  const createInstance = ({ componentName, attributes = {}, props = {} }) => {
    const instance = instantiateComponent({
      componentName,
      attributes,
      props,
    });

    instance.connectedCallback();

    return instance;
  };

  const render = ({ componentName, attributes = {}, props = {} }) => {
    const instance = createInstance({
      componentName,
      attributes,
      props,
    });

    const output = instance.toString();
    instance.disconnectedCallback();
    return output;
  };

  const start = async ({
    componentName,
    attributes = {},
    props = {},
    quitKeys = ["q"],
    footer,
  }) => {
    const quitNames = resolveQuitNames(quitKeys);
    const instance = instantiateComponent({
      componentName,
      attributes,
      props,
    });
    const terminal = createTerminalSession({ footer });

    return new Promise((resolve, reject) => {
      let closed = false;

      const stop = () => {
        if (closed) {
          return;
        }
        closed = true;

        try {
          instance.disconnectedCallback();
        } catch {
          // noop
        }

        try {
          terminal.stop();
        } catch {
          // noop
        }

        resolve();
      };

      try {
        const originalRender = instance.render.bind(instance);
        instance.render = () => {
          const output = originalRender();
          terminal.render(output);
          return output;
        };

        const openExternalEditor = (options = {}) => {
          terminal.suspend();
          try {
            return openInExternalEditor(options);
          } finally {
            terminal.resume();
          }
        };

        instance.deps = {
          ...(instance.deps || {}),
          stop,
          openExternalEditor,
        };

        terminal.start({
          onData: (chunk) => {
            const sequences = splitInputSequences(chunk);
            sequences.forEach((sequence) => {
              const keyEvent = createKeyboardEvent({
                sequence,
                target: instance._eventTargets?.window,
              });

              if (instance._eventTargets?.window) {
                instance._eventTargets.window.dispatchEvent(keyEvent);
              }

              if (shouldQuitFromKeyEvent({ keyEvent, quitNames }) && !keyEvent.defaultPrevented) {
                stop();
                return;
              }

              if (keyEvent.ctrlKey && keyEvent.name === "l" && !keyEvent.defaultPrevented) {
                terminal.render(instance.toString());
              }
            });
          },
        });

        instance.connectedCallback();
        terminal.render(instance.toString());
      } catch (error) {
        try {
          terminal.stop();
        } catch {
          // noop
        }
        reject(error);
      }
    });
  };

  return {
    registerComponent,
    createInstance,
    render,
    start,
  };
};
