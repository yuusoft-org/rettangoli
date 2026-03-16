import { describe, expect, it } from "vitest";
import { validateVtConfig } from "../src/validation.js";

describe("validateVtConfig section page keys", () => {
  it("accepts free-form section and item titles when files can derive keys", () => {
    expect(
      validateVtConfig({
        path: "./vt",
        sections: [
          {
            title: "!!!",
            files: "components",
          },
          {
            type: "groupLabel",
            title: "Group label",
            items: [
              {
                title: "@@@",
                files: "forms/advanced",
              },
            ],
          },
        ],
      }),
    ).toEqual({
      path: "./vt",
      sections: [
        {
          title: "!!!",
          files: "components",
        },
        {
          type: "groupLabel",
          title: "Group label",
          items: [
            {
              title: "@@@",
              files: "forms/advanced",
            },
          ],
        },
      ],
    });
  });
});
