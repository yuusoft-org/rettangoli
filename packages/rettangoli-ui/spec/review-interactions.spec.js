// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { bindStore } from "../../rettangoli-fe/src/core/runtime/store.js";
import * as formStore from "../src/components/form/form.store.js";
import * as form from "../src/components/form/form.handlers.js";
import * as sliderStore from "../src/components/slider-input/slider-input.store.js";
import * as slider from "../src/components/slider-input/slider-input.handlers.js";
import * as selectStore from "../src/components/select/select.store.js";
import * as select from "../src/components/select/select.handlers.js";
import * as tabs from "../src/components/tabs/tabs.handlers.js";
import createInput from "../src/primitives/input.js";
import createNumber from "../src/primitives/input-number.js";
import createTextarea from "../src/primitives/textarea.js";
import createSlider from "../src/primitives/slider.js";
import createCheckbox from "../src/primitives/checkbox.js";
import createColor from "../src/primitives/colorPicker.js";

beforeAll(() => {
  vi.stubGlobal("CSSStyleSheet", class { replaceSync() {} });
  for (const [name, factory] of Object.entries({ input: createInput, number: createNumber,
    textarea: createTextarea, slider: createSlider, checkbox: createCheckbox, color: createColor })) {
    customElements.define(`test-field-${name}`, factory({}));
  }
});
afterEach(() => document.body.replaceChildren());
const keyboard = (target, extra = {}) => ({ key: "Enter", target, currentTarget: target,
  preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra });
const formDeps = () => {
  const props = { form: { fields: [], actions: { buttons: [
    { id: "cancel", label: "Cancel" }, { id: "save", label: "Save", validate: true },
  ] } } };
  return { props, store: bindStore(formStore, props, {}), render: vi.fn(), dispatchEvent: vi.fn() };
};

describe("form keyboard activation", () => {
  it.each(["button", "rtgl-button", "textarea", "rtgl-textarea", "rtgl-select"])("preserves %s activation", (tag) => {
    const deps = formDeps(); const event = keyboard(document.createElement(tag));
    form.handleKeyDown(deps, { _event: event });
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(deps.dispatchEvent).not.toHaveBeenCalled();
  });
  it.each([{ isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }, { ctrlKey: true }])("ignores consumed/IME events: %o", (extra) => {
    const deps = formDeps();
    form.handleKeyDown(deps, { _event: keyboard(document.createElement("input"), extra) });
    expect(deps.dispatchEvent).not.toHaveBeenCalled();
  });
  it("uses the composed path for nested editors", () => {
    const deps = formDeps();
    form.handleKeyDown(deps, { _event: keyboard(document.createElement("rtgl-view"), {
      composedPath: () => [document.createElement("textarea")],
    }) });
    expect(deps.dispatchEvent).not.toHaveBeenCalled();
  });
  it("submits Save once and preserves Cancel's click action", () => {
    const deps = formDeps();
    form.handleKeyDown(deps, { _event: keyboard(document.createElement("input")) });
    const cancel = document.createElement("button"); cancel.dataset.actionId = "cancel";
    form.handleActionClick(deps, { _event: { currentTarget: cancel } });
    expect(deps.dispatchEvent.mock.calls.map(([event]) => event.detail.actionId)).toEqual(["save", "cancel"]);
  });
  it("does not fall back to Cancel when Save or the form is disabled", () => {
    for (const formDisabled of [false, true]) {
      const deps = formDeps(); deps.props.disabled = formDisabled;
      if (!formDisabled) deps.props.form.actions.buttons[1].disabled = true;
      form.handleKeyDown(deps, { _event: keyboard(document.createElement("input")) });
      expect(deps.dispatchEvent).not.toHaveBeenCalled();
    }
  });
});

describe("field accessibility across shadow roots", () => {
  it.each(["input", "number", "textarea", "slider", "checkbox", "color"])("forwards native %s metadata", (type) => {
    const host = document.createElement(`test-field-${type}`); document.body.append(host);
    const native = host.shadowRoot.querySelector("input,textarea");
    for (const [name, value] of Object.entries({ "aria-label": 'Project "One"',
      "aria-description": "Choose a name. Required", "aria-required": "true", "aria-invalid": "true" })) {
      host.setAttribute(name, value);
      const supported = name !== "aria-required" || !["slider", "color"].includes(type);
      expect(native.getAttribute(name)).toBe(supported ? value : null);
      host.removeAttribute(name); expect(native.hasAttribute(name)).toBe(false);
    }
  });
  it("connects field validation and description", () => {
    const props = { form: { fields: [{ name: "name", type: "input-text", label: "Project name", description: "Choose a name", required: true }] } };
    const state = { ...formStore.createInitialState(), errors: { name: "Required" } };
    expect(formStore.selectViewData({ state, props }).fieldLayout[0].fields[0]).toMatchObject({
      _accessibleLabel: "Project name", _accessibleDescription: "Choose a name. Required", _required: true, _invalid: true,
    });
  });
});

it("preserves empty and decimal slider drafts until commit", () => {
  const props = { value: 2.5, min: -10, max: 10, step: 0.1 };
  const store = bindStore(sliderStore, props, {});
  const input = document.createElement("test-field-number"); input.id = "input";
  input.setAttribute("value", "2.5"); document.body.append(input);
  const native = input.shadowRoot.querySelector("input");
  const deps = { store, props, refs: { input }, render: vi.fn(), dispatchEvent: vi.fn() };
  const payload = (value) => ({ _event: { currentTarget: input, detail: { value } } });
  slider.handleBeforeMount(deps); native.value = "";
  slider.handleValueInput(deps, payload(null));
  expect(native.value).toBe(""); expect(store.selectValue()).toBe(2.5);
  slider.handleValueChange(deps, payload(null)); expect(native.value).toBe("2.5");
  native.value = "-3.2"; slider.handleValueInput(deps, payload(-3.2));
  expect(native.value).toBe("-3.2"); expect(store.selectValue()).toBe(-3.2);
  expect(sliderStore.selectViewData({ state: store.getState(), props }).inputValue).toBe(2.5);
  slider.handleValueChange(deps, payload(-30)); expect(native.value).toBe("-10");
  expect(sliderStore.selectViewData({ state: store.getState(), props: { max: 0 } }).max).toBe(0);
});

it("select skips section/separator rows, commits Enter and restores focus", () => {
  const props = { options: [{ type: "section", label: "Group" }, { label: "One", value: 1 },
    { type: "separator" }, { label: "Two", value: 2 }] };
  const store = bindStore(selectStore, props, {}); const refs = {};
  for (const id of ["selectButton", "option1", "option3"]) {
    refs[id] = document.createElement("div"); refs[id].id = id; refs[id].tabIndex = 0; document.body.append(refs[id]);
  }
  const deps = { store, props, refs, render: vi.fn(), dispatchEvent: vi.fn() };
  store.openOptionsPopover({ position: {}, selectedIndex: 1 });
  select.handleOptionKeyDown(deps, { _event: keyboard(refs.option1, { key: "ArrowDown" }) });
  expect(document.activeElement).toBe(refs.option3);
  select.handleOptionKeyDown(deps, { _event: keyboard(refs.option3) });
  expect(deps.dispatchEvent.mock.calls[0][0].detail.value).toBe(2);
  expect(document.activeElement).toBe(refs.selectButton); expect(store.selectState().isOpen).toBe(false);
});

it("tabs use one roving tab stop and manual activation", () => {
  const tray = document.createElement("div");
  tray.innerHTML = '<div role="tab" data-id="one" tabindex="0"></div><div role="tab" data-id="two" tabindex="-1"></div>';
  document.body.append(tray); const deps = { dispatchEvent: vi.fn() };
  tabs.handleKeyDown(deps, { _event: keyboard(tray.firstChild, { key: "End" }) });
  expect(document.activeElement).toBe(tray.lastChild); expect(tray.firstChild.tabIndex).toBe(-1);
  expect(deps.dispatchEvent).not.toHaveBeenCalled();
  tabs.handleKeyDown(deps, { _event: keyboard(tray.lastChild) });
  expect(deps.dispatchEvent.mock.calls[0][0].detail.id).toBe("two");
});

it.each(["select", "tag-select", "segmented-control", "slider-input", "popover-input"])(
  "exposes field metadata in the %s root view model", async (name) => {
    const component = await import(`../src/components/${name}/${name}.store.js`);
    const props = { ariaLabel: 'Project "One"', ariaDescription: 'Choose a value', ariaRequired: true, ariaInvalid: true };
    if (["tag-select", "segmented-control"].includes(name)) delete props.ariaRequired;
    expect(component.selectViewData({ state: component.createInitialState(), props })).toMatchObject(props);
  },
);

it("popover text editors leave IME Enter uncommitted", async () => {
  const { handleInputKeydown } = await import('../src/components/popover-input/popover-input.handlers.js');
  const deps = { store: {}, refs: {}, render: vi.fn() };
  const event = keyboard(document.createElement('input'), { isComposing: true });
  handleInputKeydown(deps, { _event: event });
  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(deps.render).not.toHaveBeenCalled();
});
