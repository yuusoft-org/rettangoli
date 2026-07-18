import path from "node:path";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import build from "../../src/cli/build.js";
import {
  createWatchServer,
  resolveServeContext,
} from "../../src/cli/watch.js";

const packageRootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const tempParentDir = path.join(packageRootDir, ".tmp-tests");

const createFixtureProject = ({
  setupSource = "export const deps = { components: {} };\n",
  staleBundleSource = null,
  includeI18n = false,
} = {}) => {
  mkdirSync(tempParentDir, { recursive: true });

  const rootDir = mkdtempSync(path.join(tempParentDir, "rtgl-fe-vite-"));
  const componentDir = path.join(rootDir, "components", "counter");
  const outputDir = path.join(rootDir, "vt", "static", "public");

  mkdirSync(componentDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(
    path.join(rootDir, "setup.js"),
    setupSource,
  );
  writeFileSync(
    path.join(componentDir, "counter.schema.yaml"),
    "componentName: x-counter\n",
  );
  writeFileSync(
    path.join(componentDir, "counter.view.yaml"),
    includeI18n
      ? "template:\n  - 'div#root': ${i18n.common.title}\n"
      : "template:\n  - 'div#root':\n",
  );
  writeFileSync(
    path.join(componentDir, "counter.store.js"),
    "export const createInitialState = () => ({ count: 0 });\n",
  );

  if (staleBundleSource !== null) {
    writeFileSync(path.join(outputDir, "main.js"), staleBundleSource);
  }

  if (includeI18n) {
    const i18nDir = path.join(rootDir, "src", "i18n");
    mkdirSync(i18nDir, { recursive: true });
    writeFileSync(
      path.join(i18nDir, "en.yaml"),
      "common:\n  title: \"Hello\"\n",
    );
    writeFileSync(
      path.join(i18nDir, "vi.yaml"),
      "common:\n  title: \"Xin chao\"\n",
    );
  }

  return rootDir;
};

const requestFromMiddleware = async (server, url) =>
  await new Promise((resolve, reject) => {
    const headers = new Map();
    const chunks = [];
    const req = {
      url,
      originalUrl: url,
      method: "GET",
      headers: {},
    };
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
      final(callback) {
        const rawBody = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers,
          body: String(rawBody),
          rawBody,
        });
        callback();
      },
    });
    res.statusCode = 200;
    res.getHeader = (name) => headers.get(String(name).toLowerCase());
    res.setHeader = (name, value) => {
      headers.set(String(name).toLowerCase(), value);
    };
    res.writeHead = (statusCode, responseHeaders = {}) => {
      res.statusCode = statusCode;
      Object.entries(responseHeaders).forEach(([name, value]) => {
        res.setHeader(name, value);
      });
      return res;
    };

    server.middlewares.handle(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        statusCode: res.statusCode,
        headers,
        body: "",
        rawBody: Buffer.alloc(0),
      });
    });
  });

describe("vite runtime integration", () => {
  const createdDirs = [];
  const servers = [];

  afterEach(async () => {
    while (servers.length > 0) {
      const server = servers.pop();
      if (server) {
        await server.close();
      }
    }

    createdDirs.forEach((dirPath) => {
      rmSync(dirPath, { recursive: true, force: true });
    });
    createdDirs.length = 0;
  });

  it("derives serve context from static-prefixed outfile paths", () => {
    const context = resolveServeContext({
      cwd: "/repo/app",
      outfile: "vt/static/public/main.js",
    });

    expect(context).toEqual({
      root: path.resolve("/repo/app", "vt"),
      publicEntryPath: "/static/public/main.js",
    });
  });

  it("derives serve context for generic output paths", () => {
    const context = resolveServeContext({
      cwd: "/repo/app",
      outfile: "dist/bundle.js",
    });

    expect(context).toEqual({
      root: path.resolve("/repo/app"),
      publicEntryPath: "/dist/bundle.js",
    });
  });

  it("builds the configured outfile without legacy temp artifacts", async () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    await build({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
    });

    const bundlePath = path.join(rootDir, "vt", "static", "public", "main.js");
    const bundleSource = readFileSync(bundlePath, "utf8");

    expect(existsSync(bundlePath)).toBe(true);
    expect(bundleSource).toContain("x-counter");
    expect(existsSync(path.join(rootDir, ".temp"))).toBe(false);
  });

  it("supports top-level await in setup modules", async () => {
    const rootDir = createFixtureProject({
      setupSource: [
        "const ready = await Promise.resolve(true);",
        "export const deps = {",
        "  components: { ready },",
        "};",
        "",
      ].join("\n"),
    });
    createdDirs.push(rootDir);

    await build({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
    });

    expect(
      existsSync(path.join(rootDir, "vt", "static", "public", "main.js")),
    ).toBe(true);
  });

  it("builds i18n JSON assets next to the configured bundle", async () => {
    const rootDir = createFixtureProject({ includeI18n: true });
    createdDirs.push(rootDir);

    await build({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
      i18n: {
        dir: "src/i18n",
        defaultLocale: "en",
        fallbackLocale: "en",
        locales: ["en", "vi"],
      },
    });

    const enJsonPath = path.join(rootDir, "vt", "static", "public", "i18n", "en.json");
    const viJsonPath = path.join(rootDir, "vt", "static", "public", "i18n", "vi.json");

    expect(existsSync(enJsonPath)).toBe(true);
    expect(JSON.parse(readFileSync(enJsonPath, "utf8")).common.title).toBe("Hello");
    expect(JSON.parse(readFileSync(viJsonPath, "utf8")).common.title).toBe("Xin chao");
  });

  it("serves generated entry code instead of a stale on-disk bundle", async () => {
    const rootDir = createFixtureProject({
      staleBundleSource: "window.__STALE_FE_BUNDLE__ = true;\n",
    });
    createdDirs.push(rootDir);

    const server = await createWatchServer({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
    });
    servers.push(server);

    const response = await requestFromMiddleware(
      server,
      "/static/public/main.js",
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(response.body).toContain("x-counter");
    expect(response.body).toContain("customElements.define");
    expect(response.body).not.toContain("__STALE_FE_BUNDLE__");
  });

  it("serves extensionless files from the configured public directory without transforming them", async () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const publicFilePath = path.join(
      rootDir,
      "static",
      "templates",
      "default",
      "files",
      "font-file-id",
    );
    const publicFileBytes = Buffer.from([0, 1, 0, 0, 255]);
    mkdirSync(path.dirname(publicFilePath), { recursive: true });
    writeFileSync(publicFilePath, publicFileBytes);

    const server = await createWatchServer({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
      publicDir: "static",
    });
    servers.push(server);

    const response = await requestFromMiddleware(
      server,
      "/templates/default/files/font-file-id",
    );

    expect(response.statusCode).toBe(200);
    expect(response.rawBody).toEqual(publicFileBytes);
    expect(response.body).not.toContain("export default");
  });

  it.each([
    ["an empty string", ""],
    ["false", false],
  ])("keeps public serving disabled for %s", async (_label, publicDir) => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const privateFilePath = path.join(rootDir, ".git", "config");
    mkdirSync(path.dirname(privateFilePath), { recursive: true });
    writeFileSync(privateFilePath, "PRIVATE_PROJECT_CONFIGURATION\n");

    const server = await createWatchServer({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
      publicDir,
    });
    servers.push(server);

    const response = await requestFromMiddleware(server, "/.git/config");

    expect(server.config.publicDir).toBe("");
    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("PRIVATE_PROJECT_CONFIGURATION");
  });

  it("refreshes the generated entry when an outside-root YAML source changes", async () => {
    const rootDir = createFixtureProject();
    createdDirs.push(rootDir);

    const server = await createWatchServer({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
    });
    servers.push(server);

    const entryUrl = "/static/public/main.js";
    const initialResponse = await requestFromMiddleware(server, entryUrl);
    expect(initialResponse.body).not.toContain("Updated by watcher");

    writeFileSync(
      path.join(rootDir, "components", "counter", "counter.view.yaml"),
      "template:\n  - 'div#root': Updated by watcher\n",
    );

    const plugin = server.config.plugins.find(
      (candidate) => candidate.name === "rettangoli-fe",
    );
    plugin.handleHotUpdate({
      file: path.join(rootDir, "components", "counter", "counter.view.yaml"),
    });

    const updatedResponse = await requestFromMiddleware(server, entryUrl);
    if (updatedResponse.statusCode !== 200) {
      throw new Error(updatedResponse.body);
    }
    expect(updatedResponse.statusCode).toBe(200);
    expect(updatedResponse.body).toContain("Updated by watcher");
  });

  it("serves i18n JSON assets in watch mode", async () => {
    const rootDir = createFixtureProject({ includeI18n: true });
    createdDirs.push(rootDir);

    const server = await createWatchServer({
      cwd: rootDir,
      dirs: ["components"],
      setup: "setup.js",
      outfile: "vt/static/public/main.js",
      i18n: {
        dir: "src/i18n",
        defaultLocale: "en",
        fallbackLocale: "en",
        locales: ["en", "vi"],
      },
    });
    servers.push(server);

    const response = await requestFromMiddleware(
      server,
      "/static/public/i18n/vi.json",
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(JSON.parse(response.body).common.title).toBe("Xin chao");
  });
});
