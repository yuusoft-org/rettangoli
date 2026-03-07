import path from "node:path";
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
    "template:\n  - 'div#root':\n",
  );
  writeFileSync(
    path.join(componentDir, "counter.store.js"),
    "export const createInitialState = () => ({ count: 0 });\n",
  );

  if (staleBundleSource !== null) {
    writeFileSync(path.join(outputDir, "main.js"), staleBundleSource);
  }

  return rootDir;
};

const requestFromMiddleware = async (server, url) =>
  await new Promise((resolve, reject) => {
    const headers = new Map();
    const req = {
      url,
      originalUrl: url,
      method: "GET",
      headers: {},
    };
    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers.set(String(name).toLowerCase(), value);
      },
      end(body = "") {
        resolve({
          statusCode: this.statusCode,
          headers,
          body: String(body),
        });
      },
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
});
