import { describe, expect, it, vi } from "vitest";

import { handleOnUpdate } from "../src/components/form/form.handlers.js";
import {
  createInitialState,
  resetFormValues,
} from "../src/components/form/form.store.js";

const createStore = (overrides = {}) => {
  const state = {
    ...structuredClone(createInitialState()),
    ...overrides,
  };

  return {
    getState: () => state,
    resetFormValues: (payload) => resetFormValues({ state }, payload),
  };
};

const createRef = () => ({
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
});

describe("rtgl-form handleOnUpdate", () => {
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
    const store = createStore({
      formValues: {
        inheritPresentationFromSelectedLine: false,
      },
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
        oldProps: {
          key: "section-form-1",
          form,
          defaultValues: {
            inheritPresentationFromSelectedLine: false,
          },
        },
        newProps: {
          key: "section-form-2",
          form,
          defaultValues: {
            inheritPresentationFromSelectedLine: true,
          },
        },
      },
    );

    expect(store.getState().formValues).toEqual({
      inheritPresentationFromSelectedLine: true,
    });
  });

  it("does not re-seed form values when only defaultValues changes", () => {
    const store = createStore({
      formValues: {
        inheritPresentationFromSelectedLine: false,
      },
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
        oldProps: {
          key: "section-form-1",
          form,
          defaultValues: {
            inheritPresentationFromSelectedLine: false,
          },
        },
        newProps: {
          key: "section-form-1",
          form,
          defaultValues: {
            inheritPresentationFromSelectedLine: true,
          },
        },
      },
    );

    expect(store.getState().formValues).toEqual({
      inheritPresentationFromSelectedLine: false,
    });
  });
});
