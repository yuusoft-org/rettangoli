import { existsSync, readFileSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';

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
    console.error('Error: report.json not found. Run "rtgl vt report" first.');
    process.exit(1);
  }

  // Read report.json
  const report = JSON.parse(readFileSync(jsonReportPath, 'utf8'));

  if (report.items.length === 0) {
    console.log('No differences found in report. Nothing to accept.');
    return;
  }

  console.log(`Accepting ${report.items.length} changed files as new reference...`);

  try {
    for (const item of report.items) {
      // Skip items that only exist in reference (they should be deleted)
      if (item.onlyInReference) {
        const refPath = join(referenceDir, item.referencePath.replace('reference/', ''));
        if (existsSync(refPath)) {
          await rm(refPath);
          console.log(`Removed: ${refPath}`);
        }
        continue;
      }

      // Copy candidate to reference
      const candidatePath = join(siteOutputPath, item.candidatePath);
      const refPath = join(referenceDir, item.candidatePath.replace('candidate/', ''));

      if (existsSync(candidatePath)) {
        await mkdir(dirname(refPath), { recursive: true });
        await cp(candidatePath, refPath);
        console.log(`Copied: ${candidatePath} -> ${refPath}`);
      }
    }

    console.log('Done! Changes accepted.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

export default acceptReference;
