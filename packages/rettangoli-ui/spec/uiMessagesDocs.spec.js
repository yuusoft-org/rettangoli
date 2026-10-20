import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DEFAULT_UI_MESSAGES } from "../src/common/uiMessages.js";

const docsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../apps/rettangoli.dev/pages/ui/docs/introduction/getting-started.md",
);

describe("UI message docs", () => {
  it("list every key with its English default", () => {
    const docs = readFileSync(docsPath, "utf8");

    for (const [key, message] of Object.entries(DEFAULT_UI_MESSAGES)) {
      expect(docs).toContain(`| \`${key}\` | ${message} |`);
    }
  });
});
