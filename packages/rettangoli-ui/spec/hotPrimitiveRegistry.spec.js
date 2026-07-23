import { describe, expect, it } from "vitest";

import {
  HOT_PRIMITIVE_PREPARE,
  HOT_PRIMITIVE_PREPARE_STATIC,
  createHotPrimitiveRegistry,
} from "../src/hotPrimitiveRegistry.js";
import {
  prepareOverlayScrollbarControllerHotUpdate,
} from "../src/common/overlayScrollbar.js";

class FakeHTMLElement {
  constructor() {
    this.isConnected = false;
    this.scrollLeft = 0;
    this.scrollTop = 0;
  }
}

class FakeCustomElementRegistry {
  constructor() {
    this.constructors = new Map();
  }

  define(tagName, constructor) {
    if (this.constructors.has(tagName)) {
      throw new Error(`${tagName} is already defined`);
    }
    this.constructors.set(tagName, constructor);
  }

  get(tagName) {
    return this.constructors.get(tagName);
  }
}

const createRegistry = () => {
  const customElementsRegistry = new FakeCustomElementRegistry();
  return {
    customElementsRegistry,
    registry: createHotPrimitiveRegistry({
      customElementsRegistry,
      HTMLElementClass: FakeHTMLElement,
    }),
  };
};

const expectUpdated = (result) => {
  expect(result.status).toBe("updated");
  return result;
};

describe("hot primitive registry", () => {
  it("keeps element state and identity while forwarding current behavior", () => {
    const { customElementsRegistry, registry } = createRegistry();
    const connectedCalls = [];

    class ViewV1 extends FakeHTMLElement {
      static observedAttributes = ["sv"];

      constructor() {
        super();
        this.state = { count: 1 };
        this.versionAtConstruction = "created";
      }

      connectedCallback() {
        connectedCalls.push(`v1:${this.state.count}`);
      }

      get label() {
        return `v1:${this.state.count}`;
      }

      increment() {
        this.state.count += 1;
        return "v1";
      }
    }

    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: ViewV1, tagName: "rtgl-test-view" }],
    }));
    const RegisteredView = customElementsRegistry.get("rtgl-test-view");
    const view = new RegisteredView();
    view.isConnected = true;
    view.connectedCallback();
    view.state.count = 7;

    class ViewV2 extends FakeHTMLElement {
      static observedAttributes = ["sv"];

      constructor() {
        super();
        this.state = { count: 1 };
        this.versionAtConstruction = "created";
      }

      connectedCallback() {
        connectedCalls.push(`v2:${this.state.count}`);
      }

      connectedMoveCallback() {
        connectedCalls.push(`move-v2:${this.state.count}`);
      }

      get label() {
        return `v2:${this.state.count}`;
      }

      increment() {
        this.state.count += 2;
        return "v2";
      }
    }

    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: ViewV2, tagName: "rtgl-test-view" }],
    }));

    expect(customElementsRegistry.get("rtgl-test-view")).toBe(RegisteredView);
    expect(view.state.count).toBe(7);
    expect(view.label).toBe("v2:7");
    expect(view.increment()).toBe("v2");
    expect(view.state.count).toBe(9);
    view.connectedCallback();
    view.connectedMoveCallback();
    expect(connectedCalls).toEqual(["v1:1", "v2:9", "move-v2:9"]);

    const futureView = new RegisteredView();
    expect(futureView.increment()).toBe("v2");
  });

  it("uses the newest lifecycle after an update while disconnected", () => {
    const { customElementsRegistry, registry } = createRegistry();
    const calls = [];

    class ElementV1 extends FakeHTMLElement {
      connectedCallback() {
        calls.push("connect-v1");
      }

      disconnectedCallback() {
        calls.push("disconnect-v1");
      }
    }

    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: ElementV1, tagName: "rtgl-reconnect" }],
    }));
    const Element = customElementsRegistry.get("rtgl-reconnect");
    const instance = new Element();
    instance.connectedCallback();
    instance.disconnectedCallback();

    class ElementV2 extends FakeHTMLElement {
      connectedCallback() {
        calls.push("connect-v2");
      }

      disconnectedCallback() {
        calls.push("disconnect-v2");
      }
    }

    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: ElementV2, tagName: "rtgl-reconnect" }],
    }));
    instance.connectedCallback();

    expect(calls).toEqual(["connect-v1", "disconnect-v1", "connect-v2"]);
  });

  it("forwards static APIs and preserves explicitly migrated static state", () => {
    const { customElementsRegistry, registry } = createRegistry();

    class SvgV1 extends FakeHTMLElement {
      static _icons = {};
      static inputSpecificAttributes = ["v1"];

      static addIcon(name, value) {
        SvgV1._icons[name] = value;
      }

      static get icons() {
        return SvgV1._icons;
      }
    }

    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: SvgV1, tagName: "rtgl-test-svg" }],
    }));
    const Svg = customElementsRegistry.get("rtgl-test-svg");
    Svg.addIcon("check", "<svg>v1</svg>");
    expect(Svg.icons.check).toBe("<svg>v1</svg>");
    expect(Svg.inputSpecificAttributes).toEqual(["v1"]);

    class SvgV2 extends FakeHTMLElement {
      static _icons = {};
      static inputSpecificAttributes = ["v2"];

      static [HOT_PRIMITIVE_PREPARE_STATIC]({ previousClass }) {
        const nextIcons = SvgV2._icons;
        let committed = false;
        return {
          commit() {
            SvgV2._icons = previousClass._icons;
            committed = true;
          },
          rollback() {
            if (committed) {
              SvgV2._icons = nextIcons;
            }
          },
        };
      }

      static addIcon(name, value) {
        SvgV2._icons[name] = value;
      }

      static get icons() {
        return SvgV2._icons;
      }
    }

    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: SvgV2, tagName: "rtgl-test-svg" }],
    }));
    expect(Svg.icons.check).toBe("<svg>v1</svg>");
    expect(Svg.inputSpecificAttributes).toEqual(["v2"]);
    Svg.addIcon("close", "<svg>v2</svg>");
    expect(SvgV2._icons.close).toBe("<svg>v2</svg>");
  });

  it("preflights a whole batch before committing any instance migration", () => {
    const { customElementsRegistry, registry } = createRegistry();
    let migrationCommits = 0;

    class FirstV1 extends FakeHTMLElement {
      value() {
        return "first-v1";
      }
    }
    class SecondV1 extends FakeHTMLElement {
      static observedAttributes = ["value"];

      value() {
        return "second-v1";
      }
    }

    expectUpdated(registry.defineOrUpdate({
      definitions: [
        { elementClass: FirstV1, tagName: "rtgl-first" },
        { elementClass: SecondV1, tagName: "rtgl-second" },
      ],
    }));
    const first = new (customElementsRegistry.get("rtgl-first"))();

    class FirstV2 extends FakeHTMLElement {
      static [HOT_PRIMITIVE_PREPARE]() {
        return {
          commit() {
            migrationCommits += 1;
          },
        };
      }

      value() {
        return "first-v2";
      }
    }
    class SecondV2 extends FakeHTMLElement {
      static observedAttributes = ["value", "disabled"];

      value() {
        return "second-v2";
      }
    }

    const result = registry.defineOrUpdate({
      definitions: [
        { elementClass: FirstV2, tagName: "rtgl-first" },
        { elementClass: SecondV2, tagName: "rtgl-second" },
      ],
    });

    expect(result).toMatchObject({
      reason: "class-contract",
      status: "incompatible",
    });
    expect(migrationCommits).toBe(0);
    expect(first.value()).toBe("first-v1");
  });

  it("rolls back a failed batch and accepts the next valid revision", () => {
    const { customElementsRegistry, registry } = createRegistry();
    let firstMigrationState = "old";

    class FirstV1 extends FakeHTMLElement {
      value() {
        return "first-v1";
      }
    }
    class SecondV1 extends FakeHTMLElement {
      value() {
        return "second-v1";
      }
    }
    expectUpdated(registry.defineOrUpdate({
      definitions: [
        { elementClass: FirstV1, tagName: "rtgl-recover-first" },
        { elementClass: SecondV1, tagName: "rtgl-recover-second" },
      ],
    }));
    const first = new (customElementsRegistry.get("rtgl-recover-first"))();
    const second = new (customElementsRegistry.get("rtgl-recover-second"))();

    class FirstV2 extends FakeHTMLElement {
      static [HOT_PRIMITIVE_PREPARE]() {
        return {
          commit() {
            firstMigrationState = "new";
          },
          rollback() {
            firstMigrationState = "old";
          },
        };
      }

      value() {
        return "first-v2";
      }
    }
    class SecondBroken extends FakeHTMLElement {
      static [HOT_PRIMITIVE_PREPARE]() {
        return {
          commit() {
            throw new Error("broken migration");
          },
        };
      }

      value() {
        return "second-broken";
      }
    }

    expect(registry.defineOrUpdate({
      definitions: [
        { elementClass: FirstV2, tagName: "rtgl-recover-first" },
        { elementClass: SecondBroken, tagName: "rtgl-recover-second" },
      ],
    })).toMatchObject({ status: "error" });
    expect(firstMigrationState).toBe("old");
    expect(first.value()).toBe("first-v1");
    expect(second.value()).toBe("second-v1");

    class FirstV3 extends FakeHTMLElement {
      value() {
        return "first-v3";
      }
    }
    class SecondV3 extends FakeHTMLElement {
      value() {
        return "second-v3";
      }
    }
    expectUpdated(registry.defineOrUpdate({
      definitions: [
        { elementClass: FirstV3, tagName: "rtgl-recover-first" },
        { elementClass: SecondV3, tagName: "rtgl-recover-second" },
      ],
    }));
    expect(first.value()).toBe("first-v3");
    expect(second.value()).toBe("second-v3");
  });

  it("rejects base-family and constructor-state schema changes", () => {
    const { customElementsRegistry, registry } = createRegistry();

    class OriginalBase extends FakeHTMLElement {}
    const createElementClass = (createState) =>
      class OriginalElement extends OriginalBase {
        constructor() {
          super();
          Object.assign(this, createState());
        }
      };
    const OriginalElement = createElementClass(() => ({ value: 1 }));
    expectUpdated(registry.defineOrUpdate({
      definitions: [
        { elementClass: OriginalElement, tagName: "rtgl-contract" },
      ],
    }));
    new (customElementsRegistry.get("rtgl-contract"))();

    class ChangedBase extends FakeHTMLElement {}
    class ChangedFamilyElement extends ChangedBase {
      constructor() {
        super();
        this.value = 1;
      }
    }
    expect(registry.defineOrUpdate({
      definitions: [
        { elementClass: ChangedFamilyElement, tagName: "rtgl-contract" },
      ],
    })).toMatchObject({
      reason: "class-contract",
      status: "incompatible",
    });

    const ChangedStateElement = createElementClass(() => ({
      extraState: true,
      value: 1,
    }));
    expect(registry.defineOrUpdate({
      definitions: [
        { elementClass: ChangedStateElement, tagName: "rtgl-contract" },
      ],
    })).toMatchObject({
      reason: "instance-schema",
      status: "incompatible",
    });
  });

  it("rejects changed constructor listeners instead of leaving stale closures", () => {
    const { customElementsRegistry, registry } = createRegistry();

    class ListenerV1 extends FakeHTMLElement {
      constructor() {
        super();
        this.effect = "";
        this.target = {
          listener: () => {
            this.effect = "v1";
          },
        };
      }
    }
    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: ListenerV1, tagName: "rtgl-listener" }],
    }));
    const instance = new (customElementsRegistry.get("rtgl-listener"))();

    class ListenerV2 extends FakeHTMLElement {
      constructor() {
        super();
        this.effect = "";
        this.target = {
          listener: () => {
            this.effect = "v2";
          },
        };
      }
    }
    const result = registry.defineOrUpdate({
      definitions: [{ elementClass: ListenerV2, tagName: "rtgl-listener" }],
    });

    expect(result).toMatchObject({
      reason: "class-contract",
      status: "incompatible",
    });
    instance.target.listener();
    expect(instance.effect).toBe("v1");
  });

  it("rejects constructor changes inherited by input-like subclasses", () => {
    const { customElementsRegistry, registry } = createRegistry();

    const InputBaseV1 = class SharedInputBase extends FakeHTMLElement {
      constructor() {
        super();
        this.target = {
          listener: () => "base-v1",
        };
      }
    };
    const DateInputV1 = class SharedDateInput extends InputBaseV1 {};
    expectUpdated(registry.defineOrUpdate({
      definitions: [{ elementClass: DateInputV1, tagName: "rtgl-test-date" }],
    }));
    const dateInput = new (customElementsRegistry.get("rtgl-test-date"))();

    const InputBaseV2 = class SharedInputBase extends FakeHTMLElement {
      constructor() {
        super();
        this.target = {
          listener: () => "base-v2",
        };
      }
    };
    const DateInputV2 = class SharedDateInput extends InputBaseV2 {};
    const result = registry.defineOrUpdate({
      definitions: [{ elementClass: DateInputV2, tagName: "rtgl-test-date" }],
    });

    expect(result).toMatchObject({
      reason: "class-contract",
      status: "incompatible",
    });
    expect(dateInput.target.listener()).toBe("base-v1");
  });

  it("validates an entire create batch before defining any tags", () => {
    const { customElementsRegistry, registry } = createRegistry();
    class ValidElement extends FakeHTMLElement {}
    class InvalidElement extends FakeHTMLElement {}

    const invalidNameResult = registry.defineOrUpdate({
      definitions: [
        { elementClass: ValidElement, tagName: "rtgl-valid" },
        { elementClass: InvalidElement, tagName: "font-face" },
      ],
    });
    expect(invalidNameResult).toMatchObject({
      reason: "invalid-tag-name",
      status: "incompatible",
    });
    expect(customElementsRegistry.get("rtgl-valid")).toBeUndefined();

    const duplicateConstructorResult = registry.defineOrUpdate({
      definitions: [
        { elementClass: ValidElement, tagName: "rtgl-one" },
        { elementClass: ValidElement, tagName: "rtgl-two" },
      ],
    });
    expect(duplicateConstructorResult).toMatchObject({
      reason: "duplicate-constructor",
      status: "incompatible",
    });
    expect(customElementsRegistry.get("rtgl-one")).toBeUndefined();
    expect(customElementsRegistry.get("rtgl-two")).toBeUndefined();
  });
});

describe("overlay scrollbar primitive migration", () => {
  it("rolls back controller and refresh state after a later batch failure", () => {
    const layers = [];
    const shadowRoot = {
      appendChild(layer) {
        layer.parentNode = this;
        layers.push(layer);
      },
      insertBefore(layer) {
        layer.parentNode = this;
        layers.push(layer);
      },
    };

    class OverlayScrollbarController {
      constructor({ host, shadowRoot: root, slotElement }) {
        this.host = host;
        this.shadowRoot = root;
        this.slotElement = slotElement;
        this.connected = false;
        this.layer = null;
        this.refreshCount = 0;
      }

      connect() {
        this.connected = true;
        if (!this.layer) {
          const layer = {
            parentNode: null,
            nextSibling: null,
            remove() {
              const index = layers.indexOf(this);
              if (index >= 0) {
                layers.splice(index, 1);
              }
              this.parentNode = null;
            },
          };
          this.layer = layer;
          this.shadowRoot.appendChild(layer);
        }
      }

      disconnect() {
        this.connected = false;
      }

      refresh() {
        this.refreshCount += 1;
      }
    }

    const slotElement = {};
    const oldStyles = { default: { color: "old" } };
    const instance = {
      _lastStyleString: "old-style-string",
      _slotElement: slotElement,
      _styleElement: { textContent: "old-style-text" },
      _styles: oldStyles,
      isConnected: true,
      scrollLeft: 31,
      scrollTop: 47,
      shadow: shadowRoot,
    };
    const previousController = new OverlayScrollbarController({
      host: instance,
      shadowRoot,
      slotElement,
    });
    previousController.connect();
    instance._scrollbarController = previousController;
    let refreshCalls = 0;

    const operation = prepareOverlayScrollbarControllerHotUpdate({
      Controller: OverlayScrollbarController,
      instance,
      refreshInstance() {
        refreshCalls += 1;
        instance._lastStyleString = "new-style-string";
        instance._styleElement.textContent = "new-style-text";
        instance._styles = { default: { color: "new" } };
        instance.scrollLeft = 0;
        instance.scrollTop = 0;
      },
    });
    operation.commit();

    expect(instance._scrollbarController).not.toBe(previousController);
    expect(instance._scrollbarController.connected).toBe(true);
    expect(layers).toHaveLength(1);
    expect(layers[0]).toBe(instance._scrollbarController.layer);
    expect(instance.scrollLeft).toBe(31);
    expect(instance.scrollTop).toBe(47);
    expect(refreshCalls).toBe(1);
    expect(instance._lastStyleString).toBe("new-style-string");

    // This is the rollback the registry invokes when a later operation in the
    // same primitive batch throws.
    operation.rollback();
    expect(instance._scrollbarController).toBe(previousController);
    expect(previousController.connected).toBe(true);
    expect(layers).toEqual([previousController.layer]);
    expect(instance.scrollLeft).toBe(31);
    expect(instance.scrollTop).toBe(47);
    expect(instance._styles).toBe(oldStyles);
    expect(instance._lastStyleString).toBe("old-style-string");
    expect(instance._styleElement.textContent).toBe("old-style-text");
  });
});
