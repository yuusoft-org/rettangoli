import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasSelectors, resolveGroupFolders } from "./selector-filter.js";

// generate records what its run captured next to the candidates, so accept can tell a reference
// whose spec is gone from one that was simply outside a scoped (or HTML-only) run.
export const MANIFEST_FILE = ".vt-capture.json";

export function writeCaptureManifest(candidateDir, { screenshots, selectors, sections = [] }) {
  const scope = hasSelectors(selectors)
    ? {
      folders: [...new Set([...selectors.folders, ...resolveGroupFolders(sections, selectors.groups)])].sort(),
      items: [...selectors.items].sort(),
    }
    : null;
  const manifest = { version: 1, screenshots, scope };
  writeFileSync(join(candidateDir, MANIFEST_FILE), `${JSON.stringify(manifest)}\n`);
}

// The manifest, or null when it is missing or not one this version wrote.
export function readCaptureManifest(candidateDir) {
  try {
    const manifest = JSON.parse(readFileSync(join(candidateDir, MANIFEST_FILE), "utf8"));
    const scopeIsValid = manifest?.scope === null || (
      Array.isArray(manifest?.scope?.folders) && Array.isArray(manifest.scope.items)
    );
    if (manifest?.version !== 1 || typeof manifest.screenshots !== "boolean" || !scopeIsValid) {
      return null;
    }
    return manifest;
  } catch {
    return null;
  }
}
