import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(packageDir, "src/themes");
const targetDirs = [
  join(packageDir, "dist/themes"),
  join(packageDir, "vt/static/public"),
];

if (!existsSync(sourceDir)) {
  throw new Error(`CSS source directory not found: ${sourceDir}`);
}

const sourceCssFiles = readdirSync(sourceDir)
  .filter((fileName) => extname(fileName) === ".css")
  .sort();

if (sourceCssFiles.length === 0) {
  throw new Error(`No CSS files found in ${sourceDir}`);
}

for (const targetDir of targetDirs) {
  mkdirSync(targetDir, { recursive: true });

  const existingTargetCssFiles = readdirSync(targetDir)
    .filter((fileName) => extname(fileName) === ".css");

  // Remove stale files so target directories always mirror src/themes.
  for (const fileName of existingTargetCssFiles) {
    if (!sourceCssFiles.includes(fileName)) {
      unlinkSync(join(targetDir, fileName));
    }
  }

  for (const fileName of sourceCssFiles) {
    copyFileSync(join(sourceDir, fileName), join(targetDir, fileName));
  }
}

console.log(`Copied ${sourceCssFiles.length} CSS files from ${sourceDir} to: ${targetDirs.join(", ")}`);
