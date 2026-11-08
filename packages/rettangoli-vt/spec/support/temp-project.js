import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import sharp from "sharp";

// Helpers for specs that run VT commands against a throwaway project directory.
// VT reads rettangoli.config.yaml and writes .rettangoli/ relative to process.cwd(),
// so the commands have to run inside the project (`inProjectDir`).

// Never serve a stale decoded image from sharp's cache between synthetic images.
sharp.cache(false);

// Creates a temp project, optionally filled from a fixture directory. `cleanup()` removes it.
export function createTempProject({ fixtureDir = null, prefix = "rettangoli-vt-" } = {}) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  if (fixtureDir) {
    cpSync(fixtureDir, root, { recursive: true });
  }
  return {
    root,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

// Runs `callback` with `root` as the working directory and always restores the previous one.
// Specs using this must not run concurrently (describe.sequential).
export async function inProjectDir(root, callback) {
  const previous = process.cwd();
  process.chdir(root);
  try {
    return await callback();
  } finally {
    process.chdir(previous);
  }
}

// A local port that nothing listens on (free at the time of the call).
export async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

export function writeProjectFile(root, relativePath, content) {
  const filePath = join(root, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
}

// RGBA pixels filled with one color: `color` is [r, g, b] or [r, g, b, a].
export function solidPixels(width, height, color) {
  const [red, green, blue, alpha = 255] = color;
  const pixels = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
    pixels[offset + 3] = alpha;
  }
  return pixels;
}

// Copy of `pixels` with the first `count` pixels recolored.
export function recolorLeadingPixels(pixels, count, color) {
  const copy = Buffer.from(pixels);
  const [red, green, blue, alpha = 255] = color;
  for (let index = 0; index < count; index += 1) {
    copy[index * 4] = red;
    copy[index * 4 + 1] = green;
    copy[index * 4 + 2] = blue;
    copy[index * 4 + 3] = alpha;
  }
  return copy;
}

// Writes a lossless WebP (so decoded pixels are exactly the input) from raw RGBA pixels.
export async function writeWebp(filePath, { width, height, pixels }) {
  mkdirSync(dirname(filePath), { recursive: true });
  await sharp(pixels, { raw: { width, height, channels: 4 } })
    .webp({ lossless: true })
    .toFile(filePath);
}

// Sorted, forward-slash relative paths of every file under `root` (empty when it does not exist).
export function listFiles(root) {
  if (!existsSync(root)) {
    return [];
  }
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory).sort()) {
      const fullPath = join(directory, entry);
      if (statSync(fullPath).isDirectory()) {
        visit(fullPath);
      } else {
        files.push(relative(root, fullPath).split(sep).join("/"));
      }
    }
  };
  visit(root);
  return files.sort();
}

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

// { relativePath: sha256 } for every file under `root`.
export function hashTree(root) {
  const hashes = {};
  for (const file of listFiles(root)) {
    hashes[file] = sha256(readFileSync(join(root, file)));
  }
  return hashes;
}
