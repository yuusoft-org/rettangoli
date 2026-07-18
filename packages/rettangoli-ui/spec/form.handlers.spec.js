import { describe, expect, it, vi } from "vitest";

import { bindStore } from "../../rettangoli-fe/src/core/runtime/store.js";
import {
  handleOnUpdate,
  handleValueChange,
  handleValueInput,
} from "../src/components/form/form.handlers.js";
import * as formStore from "../src/components/form/form.store.js";

const createStore = ({ props, formValues = {} }) => {
  const store = bindStore(formStore, props, {});
  store.resetFormValues({ defaultValues: formValues });
  return store;
};

const createRef = () => ({
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
});

describe("rtgl-form handlers", () => {
  const form = {
    fields: [
      {
        name: "inheritPresentationFromSelectedLine",
        type: "select",
        clearable: false,
        options: [
          { value: false, label: "False" },
          { value: true, label: "True" },
        ],
      },
    ],
    actions: { buttons: [] },
  };

  it("re-seeds form values when the form key changes", () => {
    const oldProps = {
      key: "section-form-1",
      form,
      defaultValues: {
        inheritPresentationFromSelectedLine: false,
      },
    };
    const newProps = {
      key: "section-form-2",
      form,
      defaultValues: {
        inheritPresentationFromSelectedLine: true,
      },
    };
    const store = createStore({
      props: newProps,
      formValues: oldProps.defaultValues,
    });
    const render = vi.fn();

    handleOnUpdate(
      {
        store,
        render,
        refs: {
          field0: createRef(),
        },
      },
      {
        oldProps,
        newProps,
      },
    );

    expect(store.getState().formValues).toEqual({
      inheritPresentationFromSelectedLine: true,
    });
    expect(Object.isFrozen(store.getState().formValues)).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("does not re-seed form values when only defaultValues changes", () => {
    const oldProps = {
      key: "section-form-1",
      form,
      defaultValues: {
        inheritPresentationFromSelectedLine: false,
      },
    };
    const newProps = {
      key: "section-form-1",
      form,
      defaultValues: {
        inheritPresentationFromSelectedLine: true,
      },
    };
    const store = createStore({
      props: newProps,
      formValues: oldProps.defaultValues,
    });

    handleOnUpdate(
      {
        store,
        render: vi.fn(),
        refs: {
          field0: createRef(),
        },
      },
      {
        oldProps,
        newProps,
      },
    );

    expect(store.getState().formValues).toEqual({
      inheritPresentationFromSelectedLine: false,
    });
  });

  it("prunes newly hidden fields through the live bound props", () => {
    const oldForm = {
      fields: [
        { name: "visible", type: "input-text" },
        { name: "removed", type: "input-text" },
      ],
    };
    const newForm = {
      fields: [{ name: "visible", type: "input-text" }],
    };
    const liveProps = {
      key: "stable-key",
      form: oldForm,
    };
    const store = createStore({
      props: liveProps,
      formValues: {
        visible: "keep",
        removed: "prune",
      },
    });
    const before = store.getState();
    const render = vi.fn();

    liveProps.form = newForm;
    handleOnUpdate(
      {
        store,
        render,
        refs: {
          field0: createRef(),
        },
      },
      {
        oldProps: { key: "stable-key", form: oldForm },
        newProps: { key: "stable-key", form: newForm },
      },
    );

    expect(before.formValues).toEqual({
      visible: "keep",
      removed: "prune",
    });
    expect(store.getState().formValues).toEqual({ visible: "keep" });
    expect(Object.isFrozen(store.getState().formValues)).toBe(true);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["input", handleValueInput, "form-input"],
    ["change", handleValueChange, "form-change"],
  ])(
    "updates and prunes atomically on value %s",
    (_label, handler, eventName) => {
      const props = {
        form: {
          fields: [
            {
              name: "mode",
              type: "select",
              options: [
                { label: "Basic", value: "basic" },
                { label: "Advanced", value: "advanced" },
              ],
            },
            {
              name: "secret",
              type: "input-text",
              $when: 'formValues.mode == "advanced"',
            },
          ],
        },
      };
      const store = createStore({
        props,
        formValues: {
          mode: "advanced",
          secret: "remove",
        },
      });
      const before = store.getState();
      const render = vi.fn();
      const dispatchEvent = vi.fn();
      const currentTarget = {
        dataset: { fieldName: "mode" },
        removeAttribute: vi.fn(),
        setAttribute: vi.fn(),
      };

      handler(
        {
          store,
          dispatchEvent,
          render,
          props,
        },
        {
          _event: {
            currentTarget,
            detail: { value: "basic" },
          },
        },
      );

      expect(before.formValues).toEqual({
        mode: "advanced",
        secret: "remove",
      });
      expect(store.getState().formValues).toEqual({ mode: "basic" });
      expect(Object.isFrozen(store.getState().formValues)).toBe(true);
      expect(render).toHaveBeenCalledTimes(1);
      expect(dispatchEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = dispatchEvent.mock.calls[0][0];
      expect(dispatchedEvent.type).toBe(eventName);
      expect(dispatchedEvent.detail).toEqual({
        name: "mode",
        value: "basic",
        values: { mode: "basic" },
      });
    },
  );

  it.each([
    ["input", handleValueInput, "form-input"],
    ["change", handleValueChange, "form-change"],
  ])(
    "preserves invalid-path errors during reactive %s validation",
    (_label, handler, eventName) => {
      const fieldName = "profile[0].name";
      const props = {
        form: {
          fields: [
            {
              name: fieldName,
              type: "input-text",
              required: true,
            },
          ],
        },
      };
      const store = createStore({ props });
      const initialValidation = formStore.validateForm(
        props.form.fields,
        store.getState().formValues,
      );
      store.setErrors({ errors: initialValidation.errors });
      store.setReactiveMode();
      const render = vi.fn();
      const dispatchEvent = vi.fn();

      handler(
        {
          store,
          dispatchEvent,
          render,
          props,
        },
        {
          _event: {
            currentTarget: {
              dataset: { fieldName },
              removeAttribute: vi.fn(),
              setAttribute: vi.fn(),
            },
            detail: { value: "updated" },
          },
        },
      );

      expect(
        Object.prototype.hasOwnProperty.call(
          store.getState().errors,
          fieldName,
        ),
      ).toBe(true);
      expect(store.getState().errors[fieldName]).toBe(
        "Invalid form field path",
      );
      expect(store.getState().formValues).toEqual({});
      expect(render).toHaveBeenCalledTimes(1);
      expect(dispatchEvent).toHaveBeenCalledTimes(1);
      const dispatchedEvent = dispatchEvent.mock.calls[0][0];
      expect(dispatchedEvent.type).toBe(eventName);
      expect(dispatchedEvent.detail).toEqual({
        name: fieldName,
        value: "updated",
        values: {},
      });
    },
  );
});
