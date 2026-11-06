import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "vite";
import { WebSocket } from "ws";
import { createRettangoliVtWatchPlugin } from "../../src/cli/watch-plugin.js";
import { createTempProject, writeProjectFile } from "../support/temp-project.js";

// Watch mode only watched the config, specs and templates, and served vt/static from the
// copy made at the last full generation. Edits to vt/static/** (for example the theme CSS that
// ui's build:dev rewrites) were never served until a template or config change. Static changes
// now regenerate the site and tell the client what to refresh: CSS only -> "assets" with the
// public paths, CSS next to spec/template/config changes -> "html" with both, any other static
// file or a removal -> "full". The FE entry (publicEntryPath, served by Vite) and its source map are
// FE build output and are ignored.

const EVENT = "rettangoli:vt-watch";
const CONFIG = "vt:\n  path: vt\n  sections:\n    - title: View\n      files: primitives/view\n";
const TEMPLATE =
  '<!doctype html><html><head><link rel="stylesheet" href="/public/theme.css">'
  + '<script src="/public/helper.js"></script></head><body><main>{{ content }}</main></body></html>';
const SPEC = "vt/specs/primitives/view/one.html";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate, timeout = 5_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(20);
  }
  throw new Error("Timed out waiting for the expected watch event.");
};

function writeFixture(root) {
  writeProjectFile(root, "rettangoli.config.yaml", CONFIG);
  writeProjectFile(root, "vt/templates/default.html", TEMPLATE);
  writeProjectFile(root, SPEC, "<rtgl-view>Before</rtgl-view>");
  writeProjectFile(root, "vt/static/public/theme.css", "body { color: red; } /* v1 */");
  writeProjectFile(root, "vt/static/public/a.css", "a { color: red; }");
  writeProjectFile(root, "vt/static/public/old.css", "p { color: red; }");
  writeProjectFile(root, "vt/static/public/helper.js", "window.helperVersion = 1;");
  writeProjectFile(root, "vt/static/public/fonts/a.ttf", "font-v1");
  writeProjectFile(root, "vt/static/public/fonts/b.ttf", "font-v1");
  writeProjectFile(root, "vt/static/public/main.js", "window.entry = 1;");
  writeProjectFile(root, "vt/static/public/main.js.map", "{}");
}

const watchMessages = (sent) =>
  sent
    .map(([message]) => message)
    .filter((message) => message.type === "custom" && message.event === EVENT)
    .map((message) => message.data);

describe.sequential("watch mode refreshes vt/static edits", () => {
  let project = null;

  beforeEach(() => {
    project = createTempProject({ prefix: "rettangoli-vt-watch-static-" });
    writeFixture(project.root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    project?.cleanup();
    project = null;
  });

  describe("simulated watcher events", () => {
    let server = null;
    let watcher = null;
    let logger = null;
    let cwd = null;

    const emitAndSettle = async (events) => {
      const before = server.ws.send.mock.calls.length;
      for (const [event, relativePath] of events) watcher.emit(event, join(cwd, relativePath));
      await waitFor(() => server.ws.send.mock.calls.length > before, 2_000);
      await sleep(30);
      return watchMessages(server.ws.send.mock.calls.slice(before));
    };

    beforeEach(async () => {
      cwd = project.root;
      watcher = new EventEmitter();
      watcher.add = vi.fn();
      server = {
        middlewares: { use() {} },
        moduleGraph: { getModuleById: vi.fn() },
        watcher,
        ws: { on: vi.fn(), send: vi.fn() },
      };
      logger = { error: vi.fn(), log: vi.fn() };
      const plugin = createRettangoliVtWatchPlugin({
        cwd,
        debounceMs: 5,
        createWatchClientModuleSource: () => "",
        logger,
      });
      await plugin.configureServer(server);
    });

    it("watches vt/static", () => {
      expect(watcher.add).toHaveBeenCalledWith(expect.arrayContaining([join(cwd, "vt", "static")]));
    });

    it("a CSS edit regenerates the site and sends an assets update with its public path", async () => {
      await writeFile(join(cwd, "vt/static/public/theme.css"), "body { color: blue; } /* v2 */");
      const messages = await emitAndSettle([["change", "vt/static/public/theme.css"]]);
      expect(messages).toEqual([
        { type: "reload-current", updateKind: "assets", paths: ["/public/theme.css"], revision: 1 },
      ]);
      expect(await readFile(join(cwd, ".rettangoli/vt/_site/public/theme.css"), "utf8"))
        .toBe("body { color: blue; } /* v2 */");
      // The regeneration re-adds vt/static to the watcher (vt.path may have changed).
      expect(watcher.add).toHaveBeenCalledTimes(2);
      expect(watcher.add).toHaveBeenLastCalledWith(expect.arrayContaining([join(cwd, "vt", "static")]));
    });

    it("CSS paths in one batch are sorted", async () => {
      const messages = await emitAndSettle([
        ["change", "vt/static/public/theme.css"],
        ["change", "vt/static/public/a.css"],
      ]);
      expect(messages).toEqual([
        {
          type: "reload-current",
          updateKind: "assets",
          paths: ["/public/a.css", "/public/theme.css"],
          revision: 1,
        },
      ]);
    });

    it("a script, a non-CSS file or a removal sends a full update", async () => {
      const cases = [
        [["change", "vt/static/public/helper.js"]],
        [["change", "vt/static/public/fonts/a.ttf"]],
        [["unlink", "vt/static/public/fonts/b.ttf"]],
        [["change", "vt/static/public/theme.css"], ["change", "vt/static/public/helper.js"]],
        // A removed stylesheet cannot be swapped in place: the client would re-request it and
        // keep the stale styles after the 404.
        [["unlink", "vt/static/public/old.css"]],
      ];
      await rm(join(cwd, "vt/static/public/fonts/b.ttf"));
      await rm(join(cwd, "vt/static/public/old.css"));
      for (const [index, events] of cases.entries()) {
        expect(await emitAndSettle(events)).toEqual([
          { type: "reload-current", updateKind: "full", paths: [], revision: index + 1 },
        ]);
      }
      expect(existsSync(join(cwd, ".rettangoli/vt/_site/public/fonts/b.ttf"))).toBe(false);
      expect(existsSync(join(cwd, ".rettangoli/vt/_site/public/old.css"))).toBe(false);
    });

    it("CSS next to a spec change sends an html update with the source and CSS paths", async () => {
      await writeFile(join(cwd, SPEC), "<rtgl-view>After</rtgl-view>");
      const messages = await emitAndSettle([
        ["change", "vt/static/public/theme.css"],
        ["change", SPEC],
      ]);
      expect(messages).toEqual([
        {
          type: "reload-current",
          updateKind: "html",
          paths: ["specs/primitives/view/one.html", "/public/theme.css"],
          revision: 1,
        },
      ]);
      expect(await readFile(join(cwd, ".rettangoli/vt/_site/candidate/primitives/view/one.html"), "utf8"))
        .toContain("After");
    });

    it("the FE entry, its source map and editor files under vt/static are ignored", async () => {
      const sentinel = join(cwd, ".rettangoli/vt/_site/sentinel.txt");
      await writeFile(sentinel, "kept");
      for (const relativePath of [
        "vt/static/public/main.js",
        "vt/static/public/main.js.map",
        "vt/static/public/.theme.css.swp",
        "vt/static/public/theme.css~",
      ]) {
        watcher.emit("change", join(cwd, relativePath));
      }
      await sleep(150);
      expect(server.ws.send).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledTimes(1); // only "Generated the current VT site."
      expect(existsSync(sentinel)).toBe(true);
    });
  });

  it("a real Vite server serves edited and added static files", async () => {
    const cwd = project.root;
    const plugin = createRettangoliVtWatchPlugin({
      cwd,
      debounceMs: 40,
      createWatchClientModuleSource: () => "if (import.meta.hot) import.meta.hot.accept();",
      logger: { error() {}, log() {} },
    });
    const server = await createServer({
      clearScreen: false,
      configFile: false,
      logLevel: "silent",
      plugins: [plugin],
      publicDir: false,
      root: join(cwd, "vt"),
      server: { host: "127.0.0.1", port: 45_273, strictPort: false },
    });
    let socket = null;
    try {
      await server.listen();
      const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
      const get = async (pathname) => {
        const response = await fetch(`${origin}${pathname}`);
        return { status: response.status, body: await response.text() };
      };
      const messages = [];
      socket = new WebSocket(
        `ws://127.0.0.1:${server.httpServer.address().port}/?token=${server.config.webSocketToken}`,
        "vite-hmr",
      );
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(String(event.data));
        if (message.type === "custom" && message.event === EVENT) messages.push(message.data);
      });
      await new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve, { once: true });
        socket.addEventListener("error", reject, { once: true });
      });
      await server.transformRequest("/__rettangoli_vt_watch_client__.js");
      await server.transformRequest("virtual:rettangoli-vt-watch-boundary");

      expect(await get("/public/theme.css")).toEqual({ status: 200, body: "body { color: red; } /* v1 */" });

      // The watcher may report one write as more than one event, so wait for the expected
      // message instead of counting messages.
      const waitForUpdate = (updateKind, paths) => waitFor(() => messages.some((message) =>
        message.type === "reload-current" &&
        message.updateKind === updateKind &&
        JSON.stringify(message.paths) === JSON.stringify(paths)));

      await writeFile(join(cwd, "vt/static/public/theme.css"), "body { color: blue; } /* v2 */");
      await waitForUpdate("assets", ["/public/theme.css"]);
      expect(await get("/public/theme.css")).toEqual({ status: 200, body: "body { color: blue; } /* v2 */" });

      await writeFile(join(cwd, "vt/static/public/helper.js"), "window.helperVersion = 2;");
      await waitForUpdate("full", []);
      expect(await get("/public/helper.js")).toEqual({ status: 200, body: "window.helperVersion = 2;" });

      await writeFile(join(cwd, "vt/static/public/new.css"), "p { margin: 0; }");
      await waitForUpdate("assets", ["/public/new.css"]);
      expect(await get("/public/new.css")).toEqual({ status: 200, body: "p { margin: 0; }" });
      expect(messages.every((message) => message.updateKind !== "html")).toBe(true);
    } finally {
      socket?.close();
      await server.close();
    }
  }, 20_000);
});
