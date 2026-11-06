import { existsSync, readFileSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { readCaptureManifest } from '../capture-manifest.js';
import { filterRelativeScreenshotPathsBySelectors } from '../selector-filter.js';
import { listSpecKeys } from '../spec-files.js';

// A reference that only exists in the reference tree is deleted only when the last generate
// captured it: not after an HTML-only run, and not when it is outside a scoped run's selectors.
// Without a manifest (older candidates) every such reference is deleted, as before.
function createDeletionGuard(candidateDir, vtPath) {
  const manifest = readCaptureManifest(candidateDir);
  if (!manifest || (manifest.screenshots && manifest.scope === null)) {
    return () => true;
  }
  if (!manifest.screenshots) {
    return () => false;
  }
  const selectors = { folders: manifest.scope.folders, items: manifest.scope.items, groups: [] };
  const specKeys = listSpecKeys(join(vtPath, "specs"));
  return (relativePath) =>
    filterRelativeScreenshotPathsBySelectors([relativePath], selectors, [], specKeys).length === 1;
}

/**
 * Accepts candidate screenshots as the new reference by copying only files
 * that have diffs according to report.json.
 */
async function acceptReference(options = {}) {
  const {
    vtPath = "./vt",
  } = options;

  const referenceDir = join(vtPath, "reference");
  const siteOutputPath = join(".rettangoli", "vt", "_site");
  const candidateDir = join(siteOutputPath, "candidate");
  const jsonReportPath = join(".rettangoli", "vt", "report.json");

  // Check if report.json exists
  if (!existsSync(jsonReportPath)) {
    const message = 'report.json not found. Run "rtgl vt report" first.';
    console.error(`Error: ${message}`);
    throw new Error(message);
  }

  // Read report.json
  const report = JSON.parse(readFileSync(jsonReportPath, 'utf8'));

  if (report.items.length === 0) {
    console.log('No differences found in report. Nothing to accept.');
    return;
  }

  console.log(`Accepting ${report.items.length} changed files as new reference...`);

  let isDeletable = null;
  let keptCount = 0;
  let missingCandidateCount = 0;
  try {
    for (const item of report.items) {
      // Items that only exist in reference are deleted, unless the last capture did not cover them (see createDeletionGuard)
      if (item.onlyInReference) {
        const relativePath = relative('reference', item.referencePath);
        const refPath = join(referenceDir, relativePath);
        isDeletable ??= createDeletionGuard(candidateDir, vtPath);
        if (!isDeletable(relativePath)) {
          keptCount += 1;
          continue;
        }
        if (existsSync(refPath)) {
          await rm(refPath);
          console.log(`Removed: ${refPath}`);
        }
        continue;
      }

      // Copy candidate to reference
      const candidatePath = join(siteOutputPath, item.candidatePath);
      const refPath = join(referenceDir, relative('candidate', item.candidatePath));

      if (existsSync(candidatePath)) {
        await mkdir(dirname(refPath), { recursive: true });
        await cp(candidatePath, refPath);
        console.log(`Copied: ${candidatePath} -> ${refPath}`);
      } else {
        missingCandidateCount += 1;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }

  if (keptCount > 0) {
    console.warn(
      `Kept ${keptCount} reference image(s) outside the last capture scope; run a full "rtgl vt screenshot" to prune them.`,
    );
  }
  if (missingCandidateCount > 0) {
    console.warn(
      `Skipped ${missingCandidateCount} item(s) whose candidate no longer exists; re-run "rtgl vt report".`,
    );
  }
  console.log('Done! Changes accepted.');
}

export default acceptReference;
