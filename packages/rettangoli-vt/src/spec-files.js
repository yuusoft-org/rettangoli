import fs from "node:fs";
import path from "node:path";

// Spec discovery shared by generate, report, accept and watch mode.

// Dot files and directories (.DS_Store, .git, Emacs lock files ".#x"), editor backups ("x~")
// and autosaves ("#x#") are never specs.
export function isIgnoredSpecEntry(name) {
  return name.startsWith(".") || name.endsWith("~") || /^#.*#$/.test(name);
}

// True when any segment of a path relative to the specs directory is ignored.
export function hasIgnoredSpecSegment(relativePath) {
  return relativePath.split(/[\\/]/).some(isIgnoredSpecEntry);
}

// UTF-8 byte order, which is libuv's (strcmp) readdir order under node.
export function compareNames(a, b) {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

// Every file under `dir`, depth-first with siblings in byte order, so the result does not depend
// on the runtime's readdir order. Ignored names are skipped before any stat; other entries are
// stat'ed through symlinks, so a dangling link that is not ignored still throws.
export function listFilesSorted(dir, { ignore = null } = {}) {
  const files = [];
  const visit = (directory) => {
    for (const name of fs.readdirSync(directory).sort(compareNames)) {
      if (ignore?.(name)) {
        continue;
      }
      const filePath = path.join(directory, name);
      if (fs.statSync(filePath).isDirectory()) {
        visit(filePath);
      } else {
        files.push(filePath);
      }
    }
  };
  visit(dir);
  return files;
}

// Spec files under `specsDir` (empty when it does not exist; `logger` reports that).
export function listSpecFiles(specsDir, { logger = null } = {}) {
  if (!fs.existsSync(specsDir)) {
    logger?.log(`Directory ${specsDir} does not exist, skipping...`);
    return [];
  }
  return listFilesSorted(specsDir, { ignore: isIgnoredSpecEntry });
}

// A spec's key is its path relative to the specs directory, with "/" and without extension.
export function toSpecKey(relativeSpecPath) {
  const normalized = String(relativeSpecPath)
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "");
  return normalized.slice(0, normalized.length - path.extname(normalized).length);
}

export function listSpecKeys(specsDir) {
  return new Set(
    listSpecFiles(specsDir).map((filePath) => toSpecKey(path.relative(specsDir, filePath))),
  );
}

// Drops the last extension of the file name ("a/b.yaml" -> "a/b"; "a.b/c" is unchanged).
export function removeExtension(filePath) {
  return filePath.replace(/\.[^/.]+$/, "");
}

export function toHtmlOutputPath(relativeSpecPath) {
  if (relativeSpecPath.endsWith(".html")) {
    return relativeSpecPath;
  }
  return `${removeExtension(relativeSpecPath)}.html`;
}

// URL path of a spec's generated page. The browser percent-encodes spaces and non-ASCII characters
// itself, and the built-in server decodes them. "%", "#" and "?" would be read as an escape, a
// fragment or a query instead, so they are escaped here.
export function toCandidateUrlPath(relativeSpecPath) {
  const urlPath = toHtmlOutputPath(relativeSpecPath.replace(/\\/g, "/"));
  return `/candidate/${urlPath.replace(/[%#?]/g, encodeURIComponent)}`;
}

// Two specs that generate the same page would overwrite each other.
export function assertUniqueHtmlOutputs(relativePaths) {
  const sources = new Map();
  for (const relativePath of relativePaths) {
    const outputPath = toHtmlOutputPath(relativePath);
    const existing = sources.get(outputPath);
    if (existing !== undefined) {
      throw new Error(
        `Spec output collision: "${existing}" and "${relativePath}" both generate "${outputPath}".`,
      );
    }
    sources.set(outputPath, relativePath);
  }
}
