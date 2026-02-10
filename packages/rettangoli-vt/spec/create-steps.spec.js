import { describe, expect, it, vi } from "vitest";
import { createSteps } from "../src/createSteps.js";

function createExecutor(page) {
  const stepsExecutor = createSteps(page, {
    baseName: "pages/button",
    takeAndSaveScreenshot: vi.fn(),
  });
  return stepsExecutor;
}

function createSelectBlockPage({ selectedElement, interactiveCount = 1 }) {
  const interactiveLocator = {
    count: vi.fn().mockResolvedValue(interactiveCount),
    ...selectedElement,
  };
  const hostElementLocator = {
    locator: vi.fn().mockReturnValue({
      first: vi.fn().mockReturnValue(interactiveLocator),
    }),
  };
  const page = {
    getByTestId: vi.fn().mockReturnValue(hostElementLocator),
  };
  return { page, interactiveLocator };
}

describe("createSteps screenshot command", () => {
  it("delegates screenshot numbering to runner context", async () => {
    const page = {};
    const takeAndSaveScreenshot = vi
      .fn()
      .mockResolvedValue("/tmp/pages/button-01.webp");
    vi.spyOn(console, "log").mockImplementation(() => {});

    const stepsExecutor = createSteps(page, {
      baseName: "pages/button",
      takeAndSaveScreenshot,
    });

    await stepsExecutor.executeStep("screenshot");
    await stepsExecutor.executeStep("screenshot");

    expect(takeAndSaveScreenshot).toHaveBeenCalledTimes(2);
    expect(takeAndSaveScreenshot).toHaveBeenNthCalledWith(
      1,
      page,
      "pages/button",
    );
    expect(takeAndSaveScreenshot).toHaveBeenNthCalledWith(
      2,
      page,
      "pages/button",
    );
  });
});

describe("createSteps setViewport command", () => {
  it("sets viewport size using width and height args", async () => {
    const setViewportSize = vi.fn().mockResolvedValue(undefined);
    const page = {
      setViewportSize,
    };
    const stepsExecutor = createSteps(page, {
      baseName: "pages/button",
      takeAndSaveScreenshot: vi.fn(),
    });

    await stepsExecutor.executeStep("setViewport 390 844");

    expect(setViewportSize).toHaveBeenCalledTimes(1);
    expect(setViewportSize).toHaveBeenCalledWith({ width: 390, height: 844 });
  });

  it("throws for invalid viewport size args", async () => {
    const page = {
      setViewportSize: vi.fn(),
    };
    const stepsExecutor = createSteps(page, {
      baseName: "pages/button",
      takeAndSaveScreenshot: vi.fn(),
    });

    await expect(
      stepsExecutor.executeStep("setViewport 390 not-a-number"),
    ).rejects.toThrow('Invalid height: expected a finite number, got "not-a-number".');
  });
});

describe("createSteps structured action steps", () => {
  it("supports structured waitFor with selector state and timeoutMs", async () => {
    const page = {
      waitForSelector: vi.fn().mockResolvedValue(undefined),
    };
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      action: "waitFor",
      selector: "[data-testid='login-page']",
      state: "visible",
      timeoutMs: 5000,
    });

    expect(page.waitForSelector).toHaveBeenCalledTimes(1);
    expect(page.waitForSelector).toHaveBeenCalledWith(
      "[data-testid='login-page']",
      { state: "visible", timeout: 5000 },
    );
  });

  it("supports structured select with nested structured write", async () => {
    const fill = vi.fn().mockResolvedValue(undefined);
    const { page, interactiveLocator } = createSelectBlockPage({
      selectedElement: { fill },
    });
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      action: "select",
      testId: "login-email",
      steps: [
        {
          action: "write",
          value: "user@example.com",
        },
      ],
    });

    expect(page.getByTestId).toHaveBeenCalledWith("login-email");
    expect(interactiveLocator.fill).toHaveBeenCalledWith("user@example.com");
  });

  it("supports structured select with nested click", async () => {
    const click = vi.fn().mockResolvedValue(undefined);
    const { page, interactiveLocator } = createSelectBlockPage({
      selectedElement: { click },
    });
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      action: "select",
      testId: "login-submit",
      steps: [{ action: "click" }],
    });

    expect(interactiveLocator.click).toHaveBeenCalledTimes(1);
  });

  it("supports structured click by coordinates", async () => {
    const page = {
      mouse: {
        click: vi.fn().mockResolvedValue(undefined),
      },
    };
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      action: "click",
      x: 24,
      y: 42,
    });

    expect(page.mouse.click).toHaveBeenCalledWith(24, 42, { button: "left" });
  });

  it("supports structured assert action form", async () => {
    const page = {
      url: vi.fn().mockReturnValue("https://rettangoli.dev/docs/vt"),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        action: "assert",
        type: "url",
        value: "rettangoli.dev/docs",
      }),
    ).resolves.toBeUndefined();
  });

  it("throws on unknown structured action", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        action: "waitUntil",
      }),
    ).rejects.toThrow('Unknown structured action: "waitUntil".');
  });

  it("throws on invalid structured waitFor state", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        action: "waitFor",
        selector: "#app",
        state: "ready",
      }),
    ).rejects.toThrow('Structured action "waitFor" has invalid state "ready".');
  });
});

describe("createSteps structured assert", () => {
  it("rejects legacy inline assert strings", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep("assert url rettangoli.dev"),
    ).rejects.toThrow("Inline `assert` step strings are no longer supported.");
  });

  it("asserts url includes by default", async () => {
    const page = {
      url: vi.fn().mockReturnValue("https://rettangoli.dev/docs/vt"),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "url",
          value: "rettangoli.dev/docs",
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("asserts url equals with explicit match mode", async () => {
    const page = {
      url: vi.fn().mockReturnValue("https://rettangoli.dev/docs/vt"),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "url",
          value: "https://rettangoli.dev/docs/vt",
          match: "equals",
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when url assert fails", async () => {
    const page = {
      url: vi.fn().mockReturnValue("https://rettangoli.dev/docs/vt"),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "url",
          value: "https://example.com",
          match: "equals",
        },
      }),
    ).rejects.toThrow("assert url failed: expected");
  });

  it("throws for unsupported assert match mode", async () => {
    const page = {
      url: vi.fn().mockReturnValue("https://rettangoli.dev/docs/vt"),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "url",
          value: "rettangoli.dev",
          match: "startsWith",
        },
      }),
    ).rejects.toThrow('Unsupported assert match mode "startsWith".');
  });

  it("throws when url assert value is missing or empty", async () => {
    const page = {
      url: vi.fn().mockReturnValue("https://rettangoli.dev/docs/vt"),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "url",
          value: "",
        },
      }),
    ).rejects.toThrow("`assert.type=url` requires non-empty string `value`.");
  });

  it("asserts exists by selector", async () => {
    const locator = {
      first: vi.fn().mockReturnValue({
        waitFor: vi.fn().mockResolvedValue(undefined),
      }),
      count: vi.fn().mockResolvedValue(2),
    };
    const page = {
      locator: vi.fn().mockReturnValue(locator),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "exists",
          selector: ".item",
          timeoutMs: 250,
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when exists selector has no matches", async () => {
    const locator = {
      first: vi.fn().mockReturnValue({
        waitFor: vi.fn().mockResolvedValue(undefined),
      }),
      count: vi.fn().mockResolvedValue(0),
    };
    const page = {
      locator: vi.fn().mockReturnValue(locator),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "exists",
          selector: ".missing",
        },
      }),
    ).rejects.toThrow('assert exists failed: selector ".missing" matched 0 elements.');
  });

  it("asserts exists within select block", async () => {
    const { page, interactiveLocator } = createSelectBlockPage({
      selectedElement: {
        count: vi.fn().mockResolvedValue(1),
      },
    });
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        "select search-input": [
          {
            assert: {
              type: "exists",
            },
          },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(interactiveLocator.count).toHaveBeenCalledTimes(2);
  });

  it("throws when select block target does not exist for exists assert", async () => {
    const count = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const { page } = createSelectBlockPage({
      selectedElement: {
        count,
      },
    });
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        "select search-input": [
          {
            assert: {
              type: "exists",
            },
          },
        ],
      }),
    ).rejects.toThrow("assert exists failed: selected element was not found.");
  });

  it("throws when exists assert has no selector outside select block", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "exists",
        },
      }),
    ).rejects.toThrow("`assert.type=exists` requires `selector` when not in a select block.");
  });

  it("asserts visible/hidden by selector", async () => {
    const page = {
      waitForSelector: vi.fn().mockResolvedValue(undefined),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "visible",
          selector: "#panel",
          timeoutMs: 400,
        },
      }),
    ).resolves.toBeUndefined();
    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "hidden",
          selector: "#panel",
        },
      }),
    ).resolves.toBeUndefined();

    expect(page.waitForSelector).toHaveBeenNthCalledWith(
      1,
      "#panel",
      { state: "visible", timeout: 400 },
    );
    expect(page.waitForSelector).toHaveBeenNthCalledWith(
      2,
      "#panel",
      { state: "hidden" },
    );
  });

  it("asserts visible/hidden within select block", async () => {
    const waitFor = vi.fn().mockResolvedValue(undefined);
    const { page } = createSelectBlockPage({
      selectedElement: { waitFor },
    });
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      "select status-pill": [
        {
          assert: {
            type: "visible",
            timeoutMs: 250,
          },
        },
        {
          assert: {
            type: "hidden",
          },
        },
      ],
    });

    expect(waitFor).toHaveBeenNthCalledWith(1, { state: "visible", timeout: 250 });
    expect(waitFor).toHaveBeenNthCalledWith(2, { state: "hidden" });
  });

  it("throws when visible/hidden selector is missing outside select block", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "visible",
        },
      }),
    ).rejects.toThrow("`assert.type=visible` requires `selector` when not in a select block.");

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "hidden",
        },
      }),
    ).rejects.toThrow("`assert.type=hidden` requires `selector` when not in a select block.");
  });

  it("asserts text by selector with equals matching", async () => {
    const page = {
      locator: vi.fn().mockReturnValue({
        first: vi.fn().mockReturnValue({
          textContent: vi.fn().mockResolvedValue("Status: ready"),
        }),
      }),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "text",
          selector: "#status",
          value: "Status: ready",
          match: "equals",
        },
      }),
    ).resolves.toBeUndefined();
  });

  it("throws when text assert fails", async () => {
    const page = {
      locator: vi.fn().mockReturnValue({
        first: vi.fn().mockReturnValue({
          textContent: vi.fn().mockResolvedValue("Status: loading"),
        }),
      }),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "text",
          selector: "#status",
          value: "ready",
          match: "equals",
        },
      }),
    ).rejects.toThrow("assert text failed: expected");
  });

  it("throws when text assert value is not a string", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "text",
          selector: "#status",
          value: 10,
        },
      }),
    ).rejects.toThrow("`assert.type=text` requires string `value`.");
  });

  it("throws when text assert selector is missing outside select block", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "text",
          value: "ready",
        },
      }),
    ).rejects.toThrow("`assert.type=text` requires `selector` when not in a select block.");
  });

  it("asserts js global value with deep-equal object comparison", async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue({
        id: 10,
        meta: { ready: true },
        tags: ["a", "b"],
      }),
    };
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      assert: {
        type: "js",
        global: "app.payload",
        value: {
          id: 10,
          meta: { ready: true },
          tags: ["a", "b"],
        },
      },
    });

    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
      globalPath: "app.payload",
      fnPath: null,
      fnArgs: [],
    });
  });

  it("asserts js function return value", async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue(42),
    };
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      assert: {
        type: "js",
        fn: "app.getVersion",
        args: ["prod"],
        value: 42,
      },
    });

    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(page.evaluate).toHaveBeenCalledWith(expect.any(Function), {
      globalPath: null,
      fnPath: "app.getVersion",
      fnArgs: ["prod"],
    });
  });

  it("throws when js value does not deep-equal expected", async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue({ ok: false }),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "js",
          global: "__STATE__",
          value: { ok: true },
        },
      }),
    ).rejects.toThrow("assert js failed: expected");
  });

  it("throws when js assert missing global/fn or when both are set", async () => {
    const page = {
      evaluate: vi.fn(),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "js",
          value: true,
        },
      }),
    ).rejects.toThrow("`assert.type=js` requires exactly one of `global` or `fn`.");

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "js",
          global: "__STATE__",
          fn: "app.getState",
          value: true,
        },
      }),
    ).rejects.toThrow("`assert.type=js` requires exactly one of `global` or `fn`.");
  });

  it("throws when js assert value is missing", async () => {
    const page = {
      evaluate: vi.fn(),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "js",
          global: "__STATE__",
        },
      }),
    ).rejects.toThrow("`assert.type=js` requires `value`.");
  });

  it("throws when js args is not an array", async () => {
    const page = {
      evaluate: vi.fn(),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "js",
          fn: "app.getState",
          args: "not-array",
          value: true,
        },
      }),
    ).rejects.toThrow("`assert.type=js` expects `args` to be an array when provided.");
  });

  it("wraps page.evaluate failures for js assert", async () => {
    const page = {
      evaluate: vi.fn().mockRejectedValue(new Error("Expected function at window.app.getState.")),
    };
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "js",
          fn: "app.getState",
          value: true,
        },
      }),
    ).rejects.toThrow("assert js failed: Expected function at window.app.getState..");
  });

  it("asserts text in select block with structured nested assert", async () => {
    const { page, interactiveLocator } = createSelectBlockPage({
      selectedElement: {
        textContent: vi.fn().mockResolvedValue("Status: ready"),
      },
    });
    const stepsExecutor = createExecutor(page);

    await stepsExecutor.executeStep({
      "select status-pill": [
        {
          assert: {
            type: "text",
            value: "ready",
            match: "includes",
          },
        },
      ],
    });

    expect(interactiveLocator.textContent).toHaveBeenCalledTimes(1);
  });

  it("throws for unsupported assert type", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "attribute",
          selector: "#id",
          value: "ok",
        },
      }),
    ).rejects.toThrow('Unsupported assert type "attribute".');
  });

  it("throws when structured assert payload is invalid", async () => {
    const page = {};
    const stepsExecutor = createExecutor(page);

    await expect(
      stepsExecutor.executeStep({
        assert: "url",
      }),
    ).rejects.toThrow("Structured assert step must be an object.");

    await expect(
      stepsExecutor.executeStep({
        assert: {
          type: "",
        },
      }),
    ).rejects.toThrow("Structured assert step requires a non-empty `type`.");
  });
});
