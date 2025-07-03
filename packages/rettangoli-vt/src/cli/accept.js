import { existsSync, readdirSync, statSync } from 'node:fs';
import { rm, cp, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Recursively copy only WebP files from source to destination
 */
async function copyWebpFiles(sourceDir, destDir) {
  if (!existsSync(sourceDir)) {
    return;
  }

  const items = readdirSync(sourceDir);

  for (const item of items) {
    const sourcePath = join(sourceDir, item);
    const destPath = join(destDir, item);

    if (statSync(sourcePath).isDirectory()) {
      // Recursively copy subdirectories
      await copyWebpFiles(sourcePath, destPath);
    } else if (item.endsWith('.webp')) {
      // Copy WebP files only
      await mkdir(dirname(destPath), { recursive: true });
      await cp(sourcePath, destPath);
      console.log(`Copied: ${sourcePath} -> ${destPath}`);
    }
  }
}

/**
 * Accepts candidate screenshots as the new reference by removing the existing reference
 * directory and copying the candidate directory to reference.
 */
async function acceptReference(options = {}) {
  const {
    vtPath = "./vt",
  } = options;

  const referenceDir = join(vtPath, "reference");
  const siteOutputPath = join(".rettangoli", "vt", "_site");
  const candidateDir = join(siteOutputPath, "candidate");

  console.log('Accepting candidate as new reference...');

  // Check if candidate directory exists
  if (!existsSync(candidateDir)) {
    console.error('Error: Candidate directory does not exist!');
    process.exit(1);
  }

  try {
    // Remove reference directory if it exists
    if (existsSync(referenceDir)) {
      console.log('Removing existing reference directory...');
      await rm(referenceDir, { recursive: true, force: true });
    }

    // Wait for 100ms to ensure the directory is removed
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    })
    
    // Copy only WebP files from candidate to reference
    console.log('Copying WebP files from candidate to reference...');
    await copyWebpFiles(candidateDir, referenceDir);

    console.log('Done! New reference accepted.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

export default acceptReference;
