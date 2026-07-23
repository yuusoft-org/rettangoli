import { EventEmitter } from "node:events";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "vite";

import {
  createRettangoliVtWatchPlugin,
  generateVtWatchSite,
  generateVtWatchSpec,
  generateVtWatchSpecs,
} from "../src/cli/watch-plugin.js";

const createdDirectories = [];

const createProject = async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "rettangoli-vt-watch-"));
  createdDirectories.push(cwd);
  await mkdir(
    path.join(cwd, "vt", "specs", "primitives", "view"),
    { recursive: true },
  );
  await mkdir(path.join(cwd, "vt", "templates"), { recursive: true });
  await mkdir(
    path.join(cwd, ".rettangoli", "vt", "_site", "candidate"),
    { recursive: true },
  );
  await writeFile(
    path.join(cwd, "rettangoli.config.yaml"),
    `vt:
  path: vt
  skipScreenshots: true
  sections:
    - title: View
      files: primitives/view
`,
  );
  await writeFile(
    path.join(cwd, "vt", "templates", "default.html"),
    "<!doctype html><html><head><title>Watch</title></head><body><main id=\"fixture\">{{ content }}</main></body></html>",
  );
  await writeFile(
    path.join(cwd, "vt", "templates", "index.html"),
    "<!doctype html><html><body>{{ currentSection.title }}{% for file in files %}<h2>{{ file.frontMatter.title | default: file.path }}</h2><div>{{ file.contentShiki }}</div>{% endfor %}</body></html>",
  );
  const specPath = path.join(
    cwd,
    "vt",
    "specs",
    "primitives",
    "view",
    "view-scrollbar-vertical-01.html",
  );
  await writeFile(specPath, "<rtgl-view id=\"subject\">Before</rtgl-view>");
  await writeFile(
    path.join(
      cwd,
      ".rettangoli",
      "vt",
      "_site",
      "candidate",
      "previous.webp",
    ),
    "screenshot",
  );
  return { cwd, specPath };
};

afterEach(async () => {
  await Promise.all(
    createdDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("VT watch generation", () => {
  it("generates from a clean start and atomically updates a changed candidate", async () => {
    const { cwd, specPath } = await createProject();
    const outputDir = path.join(cwd, ".rettangoli", "vt", "_site");
    await rm(outputDir, { force: true, recursive: true });

    await generateVtWatchSite({ cwd });

    const candidatePath = path.join(
      outputDir,
      "candidate",
      "primitives",
      "view",
      "view-scrollbar-vertical-01.html",
    );
    expect(await readFile(candidatePath, "utf8")).toContain("Before");

    await writeFile(specPath, "<rtgl-view id=\"subject\">After</rtgl-view>");
    await generateVtWatchSpec({ cwd, filePath: specPath });

    expect(await readFile(candidatePath, "utf8")).toContain("After");
  });

  it("atomically refreshes affected overview front matter and highlighted source", async () => {
    const { cwd, specPath } = await createProject();
    const overviewPath = path.join(
      cwd,
      ".rettangoli",
      "vt",
      "_site",
      "view.html",
    );
    await writeFile(
      specPath,
      `---
title: Before title
description: Before description
---
<rtgl-view>Before source</rtgl-view>`,
    );
    await writeFile(
      path.join(
        cwd,
        "vt",
        "specs",
        "primitives",
        "view",
        "sibling.html",
      ),
      `---
title: Sibling title
---
<rtgl-view>Sibling source</rtgl-view>`,
    );
    await writeFile(
      path.join(cwd, "vt", "templates", "index.html"),
      "<!doctype html><html><body>{% for file in files %}<h2>{{ file.frontMatter.title }}</h2><p>{{ file.frontMatter.description }}</p><div>{{ file.contentShiki }}</div>{% endfor %}</body></html>",
    );
    await generateVtWatchSite({ cwd });

    const previousOverview = await readFile(overviewPath, "utf8");
    expect(previousOverview).toContain("Before title");
    expect(previousOverview).toContain("Before description");
    expect(previousOverview).toContain("Before source");
    expect(previousOverview).toContain("Sibling title");
    expect(previousOverview).toContain("Sibling source");

    await writeFile(
      specPath,
      `---
title: After title
description: After description
---
<rtgl-view>After source</rtgl-view>`,
    );
    const result = await generateVtWatchSpec({ cwd, filePath: specPath });

    expect(result.overviewPaths).toEqual([overviewPath]);
    const nextOverview = await readFile(overviewPath, "utf8");
    expect(nextOverview).toContain("After title");
    expect(nextOverview).toContain("After description");
    expect(nextOverview).toContain("After source");
    expect(nextOverview).toContain("Sibling title");
    expect(nextOverview).toContain("Sibling source");
    expect(nextOverview).not.toContain("Before title");
    expect(nextOverview).not.toContain("Before source");
  });

  it("retains the last valid site when a spec or template cannot render", async () => {
    const { cwd, specPath } = await createProject();
    await generateVtWatchSite({ cwd });
    const candidatePath = path.join(
      cwd,
      ".rettangoli",
      "vt",
      "_site",
      "candidate",
      "primitives",
      "view",
      "view-scrollbar-vertical-01.html",
    );
    const previousCandidate = await readFile(candidatePath, "utf8");
    const overviewPath = path.join(
      cwd,
      ".rettangoli",
      "vt",
      "_site",
      "view.html",
    );
    const previousOverview = await readFile(overviewPath, "utf8");
    const invalidTemplate = path.join(
      cwd,
      "vt",
      "templates",
      "default.html",
    );
    await writeFile(invalidTemplate, "{% if %}invalid{% endif %}");

    await expect(generateVtWatchSpec({ cwd, filePath: specPath }))
      .rejects.toThrow();
    expect(await readFile(candidatePath, "utf8")).toBe(previousCandidate);
    expect(await readFile(overviewPath, "utf8")).toBe(previousOverview);

    await expect(generateVtWatchSite({ cwd })).rejects.toThrow();
    expect(await readFile(candidatePath, "utf8")).toBe(previousCandidate);

    await writeFile(
      invalidTemplate,
      "<!doctype html><html><body>{{ content }}</body></html>",
    );
    await writeFile(
      path.join(cwd, "vt", "templates", "index.html"),
      "{% if %}invalid{% endif %}",
    );
    await writeFile(
      specPath,
      "<rtgl-view id=\"subject\">Must not commit</rtgl-view>",
    );
    await expect(generateVtWatchSpec({ cwd, filePath: specPath }))
      .rejects.toThrow(/overview template/);
    expect(await readFile(candidatePath, "utf8")).toBe(previousCandidate);
    expect(await readFile(overviewPath, "utf8")).toBe(previousOverview);

    await expect(generateVtWatchSite({ cwd })).rejects.toThrow(
      /overview template/,
    );
    expect(await readFile(candidatePath, "utf8")).toBe(previousCandidate);
    expect(await readFile(overviewPath, "utf8")).toBe(previousOverview);
  });

  it("preserves non-HTML candidate artifacts during a transactional full generation", async () => {
    const { cwd } = await createProject();
    await generateVtWatchSite({ cwd });

    expect(
      await readFile(
        path.join(
          cwd,
          ".rettangoli",
          "vt",
          "_site",
          "candidate",
          "previous.webp",
        ),
        "utf8",
      ),
    ).toBe("screenshot");
  });

  it("validates a debounced spec batch before committing any candidate", async () => {
    const { cwd, specPath } = await createProject();
    const secondSpecPath = path.join(
      cwd,
      "vt",
      "specs",
      "primitives",
      "view",
      "second.html",
    );
    await writeFile(secondSpecPath, "<rtgl-view>Second before</rtgl-view>");
    await generateVtWatchSite({ cwd });
    const firstCandidatePath = path.join(
      cwd,
      ".rettangoli",
      "vt",
      "_site",
      "candidate",
      "primitives",
      "view",
      "view-scrollbar-vertical-01.html",
    );
    const previousFirstCandidate = await readFile(firstCandidatePath, "utf8");
    const overviewPath = path.join(
      cwd,
      ".rettangoli",
      "vt",
      "_site",
      "view.html",
    );
    const previousOverview = await readFile(overviewPath, "utf8");

    await writeFile(specPath, "<rtgl-view>First after</rtgl-view>");
    await writeFile(
      secondSpecPath,
      "---\ntitle: [unterminated\n---\n<rtgl-view>Invalid</rtgl-view>",
    );

    await expect(generateVtWatchSpecs({
      cwd,
      filePaths: [specPath, secondSpecPath],
    })).rejects.toThrow();
    expect(await readFile(firstCandidatePath, "utf8"))
      .toBe(previousFirstCandidate);
    expect(await readFile(overviewPath, "utf8")).toBe(previousOverview);
  });
});

describe("VT watch Vite plugin", () => {
  it("keeps create/delete HTML events inside a real Vite HMR boundary", async () => {
    const { cwd } = await createProject();
    const outputDir = path.join(cwd, ".rettangoli", "vt", "_site");
    await rm(outputDir, { force: true, recursive: true });
    await mkdir(
      path.join(cwd, "vt", "static", "public", "fonts"),
      { recursive: true },
    );
    await writeFile(
      path.join(cwd, "vt", "static", "public", "fonts", "watch.ttf"),
      "font",
    );

    const plugin = createRettangoliVtWatchPlugin({
      cwd,
      debounceMs: 5,
      createWatchClientModuleSource: () =>
        "if (import.meta.hot) import.meta.hot.accept();",
    });
    const server = await createServer({
      clearScreen: false,
      configFile: false,
      logLevel: "silent",
      plugins: [plugin],
      publicDir: false,
      root: path.join(cwd, "vt"),
      server: {
        host: "127.0.0.1",
        port: 45_173,
        strictPort: true,
      },
    });
    let socket = null;

    try {
      await server.listen();
      const address = server.httpServer.address();
      const origin = `http://127.0.0.1:${address.port}`;
      const candidateResponse = await fetch(
        `${origin}/candidate/primitives/view/view-scrollbar-vertical-01`,
      );
      expect(candidateResponse.status).toBe(200);
      expect(await candidateResponse.text()).toContain(
        "data-rtgl-watch-client",
      );
      const fontResponse = await fetch(`${origin}/public/fonts/watch.ttf`);
      expect(fontResponse.headers.get("content-type")).toBe("font/ttf");

      await server.transformRequest("/__rettangoli_vt_watch_client__.js");
      await server.transformRequest("virtual:rettangoli-vt-watch-boundary");

      const messages = [];
      socket = new WebSocket(
        `ws://127.0.0.1:${address.port}/?token=${server.config.webSocketToken}`,
        "vite-hmr",
      );
      socket.addEventListener("message", (event) => {
        messages.push(JSON.parse(String(event.data)));
      });
      await new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve, { once: true });
        socket.addEventListener("error", reject, { once: true });
      });

      const addedSpecPath = path.join(
        cwd,
        "vt",
        "specs",
        "primitives",
        "view",
        "watch-added.html",
      );
      const waitForCustomUpdate = async (startIndex) => {
        const deadline = Date.now() + 5_000;
        while (Date.now() < deadline) {
          const nextMessages = messages.slice(startIndex);
          if (nextMessages.some(
            (message) =>
              message.type === "custom" &&
              message.event === "rettangoli:vt-watch" &&
              message.data?.type === "reload-current",
          )) {
            return nextMessages;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        throw new Error("Timed out waiting for the VT custom update.");
      };

      let startIndex = messages.length;
      await writeFile(addedSpecPath, "<rtgl-view>Added</rtgl-view>");
      let updateMessages = await waitForCustomUpdate(startIndex);
      expect(updateMessages.some(
        (message) => message.type === "full-reload",
      )).toBe(false);
      expect(
        await fetch(
          `${origin}/candidate/primitives/view/watch-added`,
        ).then((response) => response.text()),
      ).toContain("Added");

      startIndex = messages.length;
      await rm(addedSpecPath);
      updateMessages = await waitForCustomUpdate(startIndex);
      expect(updateMessages.some(
        (message) => message.type === "full-reload",
      )).toBe(false);
      expect(
        await fetch(`${origin}/candidate/primitives/view/watch-added`)
          .then((response) => response.status),
      ).toBe(404);
    } finally {
      socket?.close();
      await server.close();
    }
  }, 15_000);

  it("serves clean candidate URLs, injects the client, and suppresses HTML full reloads", async () => {
    const { cwd, specPath } = await createProject();
    const watcher = new EventEmitter();
    watcher.add = vi.fn();
    const middlewares = [];
    const boundaryModule = { id: "\0virtual:rettangoli-vt-watch-boundary" };
    const server = {
      middlewares: {
        use: (middleware) => middlewares.push(middleware),
      },
      moduleGraph: {
        getModuleById: vi.fn(() => boundaryModule),
      },
      watcher,
      ws: {
        on: vi.fn(),
        send: vi.fn(),
      },
    };
    const plugin = createRettangoliVtWatchPlugin({
      cwd,
      debounceMs: 5,
      createWatchClientModuleSource: () =>
        "if (import.meta.hot) import.meta.hot.accept();",
      logger: {
        error: vi.fn(),
        log: vi.fn(),
      },
    });

    await plugin.configureServer(server);

    const middleware = middlewares[0];
    const response = {
      body: "",
      headers: {},
      end(value = "") {
        this.body += value;
      },
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
    };
    const next = vi.fn();
    await middleware(
      {
        method: "GET",
        url: "/candidate/primitives/view/view-scrollbar-vertical-01",
      },
      response,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(response.body).toContain("<rtgl-view");
    expect(response.body).toContain("data-rtgl-watch-client");
    expect(response.body).toContain("/__rettangoli_vt_watch_client__.js");

    expect(plugin.handleHotUpdate({
      file: specPath,
      modules: [],
    })).toEqual([boundaryModule]);
    expect(server.ws.send).not.toHaveBeenCalled();

    await writeFile(specPath, "<rtgl-view id=\"subject\">Live</rtgl-view>");
    watcher.emit("change", specPath);
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(server.ws.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "custom",
        event: "rettangoli:vt-watch",
        data: expect.objectContaining({
          type: "reload-current",
          updateKind: "html",
        }),
      }),
    );
    expect(server.ws.send.mock.calls.some(
      ([message]) => message.type === "full-reload",
    )).toBe(false);
    expect(
      await readFile(
        path.join(cwd, ".rettangoli", "vt", "_site", "view.html"),
        "utf8",
      ),
    ).toContain("Live");

    const stateListener = server.ws.on.mock.calls.find(
      ([eventName]) => eventName === "rettangoli:vt-watch:state-request",
    )?.[1];
    const stateClient = { send: vi.fn() };
    stateListener({}, stateClient);
    expect(stateClient.send).toHaveBeenLastCalledWith(
      "rettangoli:vt-watch",
      expect.objectContaining({
        type: "reload-current",
      }),
    );

    await writeFile(
      path.join(cwd, "vt", "templates", "default.html"),
      "{% if %}invalid{% endif %}",
    );
    watcher.emit(
      "change",
      path.join(cwd, "vt", "templates", "default.html"),
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    stateListener({}, stateClient);
    expect(stateClient.send).toHaveBeenLastCalledWith(
      "rettangoli:vt-watch",
      expect.objectContaining({
        message: expect.stringContaining("invalid value expression"),
        type: "watch-error",
      }),
    );
  });

  it("never serves the stale generated FE entry from static output", async () => {
    const { cwd } = await createProject();
    await mkdir(
      path.join(cwd, "vt", "static", "public"),
      { recursive: true },
    );
    await writeFile(
      path.join(cwd, "vt", "static", "public", "main.js"),
      "window.STALE_BUILD = true;",
    );
    const watcher = new EventEmitter();
    watcher.add = vi.fn();
    const middlewares = [];
    const plugin = createRettangoliVtWatchPlugin({
      cwd,
      createWatchClientModuleSource: () => "",
    });
    await plugin.configureServer({
      middlewares: {
        use: (middleware) => middlewares.push(middleware),
      },
      moduleGraph: {
        getModuleById: vi.fn(),
      },
      watcher,
      ws: {
        on: vi.fn(),
        send: vi.fn(),
      },
    });
    const next = vi.fn();

    for (const url of [
      "/public/main.js",
      "/%70ublic/main.js",
      "//public//main.js",
    ]) {
      await middlewares[0](
        { method: "GET", url },
        {
          end: vi.fn(),
          setHeader: vi.fn(),
        },
        next,
      );
    }

    expect(next).toHaveBeenCalledTimes(3);
  });
});
