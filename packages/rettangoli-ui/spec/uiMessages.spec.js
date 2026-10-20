import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_UI_MESSAGES,
  getUiMessage,
} from "../src/common/uiMessages.js";
import { selectViewData as selectSelectViewData } from "../src/components/select/select.store.js";
import { selectViewData as selectTabsViewData } from "../src/components/tabs/tabs.store.js";
import { selectViewData as selectTagSelectViewData } from "../src/components/tag-select/tag-select.store.js";
import {
  createInitialState as createGlobalUiInitialState,
  setConfirmConfig,
  setComponentDialogConfig,
} from "../src/components/global-ui/global-ui.store.js";

const originalMessages = globalThis.rtglUiMessages;

afterEach(() => {
  if (originalMessages === undefined) {
    delete globalThis.rtglUiMessages;
  } else {
    globalThis.rtglUiMessages = originalMessages;
  }
});

const createSelectState = () => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  selectedValue: undefined,
  hoveredOptionId: undefined,
  searchQuery: "",
});

describe("getUiMessage", () => {
  it("returns the English default without app messages", () => {
    delete globalThis.rtglUiMessages;

    for (const [key, message] of Object.entries(DEFAULT_UI_MESSAGES)) {
      expect(getUiMessage(key)).toBe(message);
    }
  });

  it("returns the app's message for a key", () => {
    globalThis.rtglUiMessages = { selectPlaceholder: "Sélectionnez une option" };

    expect(getUiMessage("selectPlaceholder")).toBe("Sélectionnez une option");
    expect(getUiMessage("tabs")).toBe("Tabs");
  });

  it("keeps the default for empty and non-string messages", () => {
    globalThis.rtglUiMessages = {
      selectPlaceholder: "",
      tabs: "   ",
      menu: 42,
      dialogOk: null,
    };

    expect(getUiMessage("selectPlaceholder")).toBe("Select an option");
    expect(getUiMessage("tabs")).toBe("Tabs");
    expect(getUiMessage("menu")).toBe("Menu");
    expect(getUiMessage("dialogOk")).toBe("OK");
  });
});

describe("components with app messages", () => {
  it("uses app messages where the component has no text of its own", () => {
    globalThis.rtglUiMessages = {
      selectPlaceholder: "Sélectionnez une option",
      selectClear: "Effacer la sélection",
      selectSearchPlaceholder: "Rechercher une option",
      tabs: "Onglets",
      tagSelectPlaceholder: "Ajouter une étiquette",
      tagSelectSave: "Enregistrer",
    };

    const select = selectSelectViewData({
      state: createSelectState(),
      props: { options: [{ label: "One", value: 1 }] },
    });
    expect(select.selectedLabel).toBe("Sélectionnez une option");
    expect(select.clearSelectionLabel).toBe("Effacer la sélection");
    expect(select.searchPlaceholder).toBe("Rechercher une option");

    expect(selectTabsViewData({ props: { items: [] } }).ariaLabel).toBe(
      "Onglets",
    );

    const tagSelect = selectTagSelectViewData({
      state: { isOpen: false, position: {}, draftValues: [] },
      props: { options: [] },
    });
    expect(tagSelect.placeholder).toBe("Ajouter une étiquette");
    expect(tagSelect.submitLabel).toBe("Enregistrer");
  });

  it("keeps a component's own text over app messages", () => {
    globalThis.rtglUiMessages = {
      selectPlaceholder: "Sélectionnez une option",
      tabs: "Onglets",
    };

    expect(
      selectSelectViewData({
        state: createSelectState(),
        props: { options: [], placeholder: "Pick a color" },
      }).selectedLabel,
    ).toBe("Pick a color");
    expect(
      selectTabsViewData({ props: { items: [], ariaLabel: "Views" } })
        .ariaLabel,
    ).toBe("Views");
  });

  it("uses app messages for dialog buttons", () => {
    globalThis.rtglUiMessages = {
      dialogConfirm: "Oui",
      dialogCancel: "Annuler",
      dialogOk: "OK",
    };

    const state = structuredClone(createGlobalUiInitialState());
    setConfirmConfig({ state }, { message: "Continuer ?" });
    expect(state.config).toMatchObject({
      confirmText: "Oui",
      cancelText: "Annuler",
    });

    setComponentDialogConfig({ state }, { component: "x-panel" });
    expect(
      state.componentDialogConfig.actions.buttons.map(({ label }) => label),
    ).toEqual(["Annuler", "OK"]);
  });
});
