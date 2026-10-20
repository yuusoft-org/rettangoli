import { afterEach, describe, expect, it } from "vitest";

import { getFormMessage, setFormMessages } from "../src/common/formMessages.js";
import { validateField } from "../src/components/form/form.store.js";

const originalLegacyMessages = globalThis.rtglFormMessages;

afterEach(() => {
  setFormMessages({});
  if (originalLegacyMessages === undefined) {
    delete globalThis.rtglFormMessages;
  } else {
    globalThis.rtglFormMessages = originalLegacyMessages;
  }
});

const requiredField = { name: "title", type: "input-text", required: true };

describe("setFormMessages", () => {
  it("replaces the default validation messages", () => {
    setFormMessages({ required: "Ce champ est obligatoire" });

    expect(validateField(requiredField, "")).toBe("Ce champ est obligatoire");
  });

  it("replaces the previous messages instead of merging them", () => {
    setFormMessages({ required: "Ce champ est obligatoire" });
    setFormMessages({ pattern: "Format non valide" });

    expect(getFormMessage("required")).toBeUndefined();
    expect(validateField(requiredField, "")).toBe("This field is required");
  });

  it("is shared by every copy of the module, as in the script-tag bundles", async () => {
    const secondCopy = await import("../src/common/formMessages.js?second-copy");
    // A separate module instance, not the one imported above.
    expect(secondCopy.setFormMessages).not.toBe(setFormMessages);
    setFormMessages({ required: "Ce champ est obligatoire" });

    expect(secondCopy.getFormMessage("required")).toBe(
      "Ce champ est obligatoire",
    );
  });

  it("keeps a field's own message", () => {
    setFormMessages({ required: "Ce champ est obligatoire" });

    expect(
      validateField(
        { ...requiredField, required: { message: "Name the scene" } },
        "",
      ),
    ).toBe("Name the scene");
  });
});

describe("window.rtglFormMessages (deprecated)", () => {
  it("is still read", () => {
    globalThis.rtglFormMessages = { required: "Este campo é obrigatório" };

    expect(validateField(requiredField, "")).toBe("Este campo é obrigatório");
  });

  it("comes after messages set with setFormMessages", () => {
    globalThis.rtglFormMessages = {
      required: "Este campo é obrigatório",
      pattern: "Formato inválido",
    };
    setFormMessages({ required: "Ce champ est obligatoire" });

    expect(getFormMessage("required")).toBe("Ce champ est obligatoire");
    expect(getFormMessage("pattern")).toBe("Formato inválido");
  });
});
