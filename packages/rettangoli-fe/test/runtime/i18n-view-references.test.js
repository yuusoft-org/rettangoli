import { describe, expect, it } from "vitest";

import {
  collectI18nReferencesFromView,
  collectRenderableI18nReferencesFromView,
  validateViewI18nReferences,
} from "../../src/core/i18n/viewReferences.js";

describe("i18n view references", () => {
  it("collects two-level i18n references", () => {
    const result = collectI18nReferencesFromView({
      value: {
        template: [
          {
            "rtgl-text s=h1": "${i18n.projectsPage.title}",
          },
        ],
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.references).toMatchObject([
      {
        namespace: "projectsPage",
        key: "title",
      },
    ]);
  });

  it("rejects single-level, three-level, and function call references", () => {
    const result = collectI18nReferencesFromView({
      value: {
        template: [
          "${i18n.title}",
          "${i18n.common.actions.save}",
          "${i18n.completedCount({ count })}",
        ],
      },
    });

    expect(result.issues.map((issue) => issue.message)).toEqual([
      "i18n references must use two levels: i18n.namespace.key.",
      "i18n references must not be deeper than i18n.namespace.key.",
      "i18n function calls are not supported.",
    ]);
  });

  it("ignores non-framework data paths that contain an i18n property", () => {
    const result = collectI18nReferencesFromView({
      value: {
        template: [
          "${settings.i18n.enabled}",
          "${project.i18n.statusLabel}",
        ],
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.references).toEqual([]);
  });

  it("reports missing keys against the default locale catalog", () => {
    const errors = validateViewI18nReferences({
      viewYaml: {
        template: ["${i18n.projectsPage.missingTitle}"],
      },
      componentLabel: "pages/projectsPage",
      filePath: "/repo/pages/projectsPage/projectsPage.view.yaml",
      i18nContext: {
        enabled: true,
        defaultLocale: "en",
        catalogs: {
          en: {
            projectsPage: {
              title: "Projects",
            },
          },
        },
      },
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("RTGL-I18N-003");
  });

  it("collects template and event payload references as renderable i18n surfaces", () => {
    const result = collectRenderableI18nReferencesFromView({
      viewYaml: {
        refs: {
          saveButton: {
            eventListeners: {
              click: {
                handler: "handleSave",
                payload: {
                  label: "${i18n.common.saveButton}",
                },
              },
            },
          },
        },
        template: [
          {
            "button#saveButton aria-label=${i18n.common.saveButton}": "${i18n.projectsPage.title}",
          },
        ],
      },
    });

    expect(result.issues).toEqual([]);
    expect(result.references).toMatchObject([
      {
        namespace: "common",
        key: "saveButton",
      },
      {
        namespace: "projectsPage",
        key: "title",
      },
      {
        namespace: "common",
        key: "saveButton",
      },
    ]);
  });

  it("validates event payload i18n references against the default catalog", () => {
    const errors = validateViewI18nReferences({
      viewYaml: {
        refs: {
          saveButton: {
            eventListeners: {
              click: {
                handler: "handleSave",
                payload: {
                  label: "${i18n.common.missingButton}",
                },
              },
            },
          },
        },
      },
      componentLabel: "components/saveButton",
      filePath: "/repo/components/saveButton/saveButton.view.yaml",
      i18nContext: {
        enabled: true,
        defaultLocale: "en",
        catalogs: {
          en: {
            common: {
              saveButton: "Save",
            },
          },
        },
      },
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("RTGL-I18N-003");
    expect(errors[0].message).toContain("common.missingButton");
  });

  it("rejects i18n references outside renderable view fields", () => {
    const errors = validateViewI18nReferences({
      viewYaml: {
        refs: {
          saveButton: {
            eventListeners: {
              click: {
                handler: "${i18n.common.saveButton}",
              },
            },
          },
        },
      },
      componentLabel: "components/saveButton",
      filePath: "/repo/components/saveButton/saveButton.view.yaml",
      i18nContext: {
        enabled: true,
        defaultLocale: "en",
        catalogs: {
          en: {
            common: {
              saveButton: "Save",
            },
          },
        },
      },
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("RTGL-I18N-004");
    expect(errors[0].message).toContain("event listener payloads");
  });

  it("does not require fe.i18n config for ordinary data paths with an i18n property", () => {
    const errors = validateViewI18nReferences({
      viewYaml: {
        template: ["${settings.i18n.enabled}"],
      },
      componentLabel: "components/settingsPanel",
      filePath: "/repo/components/settingsPanel/settingsPanel.view.yaml",
      i18nContext: {
        enabled: false,
      },
    });

    expect(errors).toEqual([]);
  });
});
