import fs from "fs";
import path from "path";
import crypto from "crypto";
import { cp } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import sharp from "sharp";
import { readYaml } from "../common.js";
import { validateVtConfig } from "../validation.js";
import { resolveReportOptions } from "./report-options.js";
import {
  buildAllRelativePaths,
  toMismatchingItems,
  buildJsonReport,
} from "../report/report-model.js";
import { renderHtmlReport } from "../report/report-render.js";
import {
  filterRelativeScreenshotPathsBySelectors,
  hasSelectors,
} from "../selector-filter.js";

const libraryTemplatesPath = new URL("./templates", import.meta.url).pathname;

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      fileList = getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

async function calculateImageHash(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const hash = crypto.createHash("md5").update(imageBuffer).digest("hex");
  return hash;
}

async function compareImagesMd5(artifactPath, goldPath) {
  try {
    const artifactHash = await calculateImageHash(artifactPath);
    const goldHash = await calculateImageHash(goldPath);
    return { equal: artifactHash === goldHash, error: false };
  } catch (error) {
    console.error("Error comparing images:", error);
    return { equal: false, error: true, message: error.message };
  }
}

async function compareImagesPixelmatch(artifactPath, goldPath, diffPath, options = {}) {
  const { colorThreshold = 0.1, diffThreshold = 0.3 } = options;

  try {
    const [artifactData, goldData] = await Promise.all([
      sharp(artifactPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(goldPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);

    const { width, height } = artifactData.info;
    const goldWidth = goldData.info.width;
    const goldHeight = goldData.info.height;
    const totalPixels = width * height;

    if (width !== goldWidth || height !== goldHeight) {
      return { equal: false, error: false, diffPixels: -1, totalPixels, similarity: 0 };
    }

    const diffBuffer = Buffer.alloc(totalPixels * 4);

    const diffPixels = pixelmatch(
      artifactData.data,
      goldData.data,
      diffBuffer,
      width,
      height,
      { threshold: colorThreshold },
    );

    const diffPercent = (diffPixels / totalPixels) * 100;
    const similarity = (100 - diffPercent).toFixed(2);
    const equal = diffPercent < diffThreshold;

    if (!equal && diffPath) {
      fs.mkdirSync(path.dirname(diffPath), { recursive: true });
      await sharp(diffBuffer, { raw: { width, height, channels: 4 } })
        .png()
        .toFile(diffPath);
    }

    return { equal, error: false, diffPixels, totalPixels, similarity };
  } catch (error) {
    console.error("Error comparing images with pixelmatch:", error);
    return { equal: false, error: true, message: error.message };
  }
}

async function compareImages(artifactPath, goldPath, method = "pixelmatch", diffPath = null, options = {}) {
  if (method === "md5") {
    return compareImagesMd5(artifactPath, goldPath);
  }
  return compareImagesPixelmatch(artifactPath, goldPath, diffPath, options);
}

async function main(options = {}) {
  const mainConfigPath = "rettangoli.config.yaml";
  let mainConfig;
  try {
    mainConfig = await readYaml(mainConfigPath);
  } catch (error) {
    throw new Error(`Unable to read "${mainConfigPath}": ${error.message}`, { cause: error });
  }

  const vtConfig = mainConfig?.vt;
  if (!vtConfig) {
    throw new Error(`Invalid "${mainConfigPath}": missing required "vt" section.`);
  }

  const configData = validateVtConfig(vtConfig, mainConfigPath);
  const {
    vtPath,
    compareMethod,
    colorThreshold,
    diffThreshold,
    selectors,
  } = resolveReportOptions(options, configData);

  const siteOutputPath = path.join(".rettangoli", "vt", "_site");
  const candidateDir = path.join(siteOutputPath, "candidate");
  const diffDir = path.join(siteOutputPath, "diff");
  const originalReferenceDir = path.join(vtPath, "reference");
  const siteReferenceDir = path.join(siteOutputPath, "reference");
  const templatePath = path.join(libraryTemplatesPath, "report.html");
  const outputPath = path.join(siteOutputPath, "report.html");
  const jsonReportPath = path.join(".rettangoli", "vt", "report.json");

  console.log(`Comparison method: ${compareMethod}`);
  if (compareMethod === "pixelmatch") {
    console.log(`  color threshold: ${colorThreshold}, diff threshold: ${diffThreshold}%`);
  }

  if (!fs.existsSync(originalReferenceDir)) {
    console.log("Reference directory does not exist, creating it...");
    fs.mkdirSync(originalReferenceDir, { recursive: true });
  }

  if (compareMethod === "pixelmatch" && !fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }

  if (fs.existsSync(originalReferenceDir)) {
    console.log("Copying reference directory to _site...");
    await cp(originalReferenceDir, siteReferenceDir, { recursive: true });
  }

  try {
    if (!fs.existsSync(candidateDir)) {
      throw new Error(`Candidate screenshots directory not found: "${candidateDir}". Run "rtgl vt generate" first.`);
    }

    const candidateFiles = getAllFiles(candidateDir).filter((file) => file.endsWith(".webp"));
    const referenceFiles = getAllFiles(originalReferenceDir).filter((file) => file.endsWith(".webp"));

    console.log("Candidate Screenshots:", candidateFiles.length);
    console.log("Reference Screenshots:", referenceFiles.length);

    const results = [];
    const comparisonErrors = [];

    const candidateRelativePaths = candidateFiles.map((file) =>
      path.relative(candidateDir, file),
    );
    const referenceRelativePaths = referenceFiles.map((file) =>
      path.relative(originalReferenceDir, file),
    );

    const allPaths = buildAllRelativePaths(candidateRelativePaths, referenceRelativePaths);
    const scopedPaths = filterRelativeScreenshotPathsBySelectors(
      allPaths,
      selectors,
      configData.sections,
    );
    if (hasSelectors(selectors)) {
      const excludedCount = allPaths.length - scopedPaths.length;
      console.log(`Selector scope: ${scopedPaths.length} image(s) selected, ${excludedCount} excluded.`);
    }

    for (const relativePath of scopedPaths) {
      const candidatePath = path.join(candidateDir, relativePath);
      const referencePath = path.join(originalReferenceDir, relativePath);
      const siteReferencePath = path.join(siteReferenceDir, relativePath);
      const diffPath = path.join(diffDir, relativePath.replace(".webp", "-diff.png"));

      const candidateExists = fs.existsSync(candidatePath);
      const referenceExists = fs.existsSync(referencePath);

      if (!candidateExists && !referenceExists) continue;

      let equal = true;
      let error = false;
      let similarity = null;
      let diffPixels = null;

      if (candidateExists && referenceExists) {
        const diffDirPath = path.dirname(diffPath);
        if (!fs.existsSync(diffDirPath)) {
          fs.mkdirSync(diffDirPath, { recursive: true });
        }

        const comparison = await compareImages(
          candidatePath,
          referencePath,
          compareMethod,
          diffPath,
          { colorThreshold, diffThreshold },
        );
        if (comparison.error) {
          comparisonErrors.push(
            `${relativePath}: ${comparison.message || "unknown comparison error"}`,
          );
          continue;
        }
        equal = comparison.equal;
        error = comparison.error;
        similarity = comparison.similarity;
        diffPixels = comparison.diffPixels;
      } else {
        equal = false;
      }

      if (!error) {
        results.push({
          candidatePath: candidateExists ? candidatePath : null,
          referencePath: referenceExists ? siteReferencePath : null,
          path: relativePath,
          equal: candidateExists && referenceExists ? equal : false,
          similarity,
          diffPixels,
          onlyInCandidate: candidateExists && !referenceExists,
          onlyInReference: !candidateExists && referenceExists,
        });
      }
    }

    if (comparisonErrors.length > 0) {
      throw new Error(
        `Image comparison failed for ${comparisonErrors.length} file(s):\n- ${comparisonErrors.join("\n- ")}`,
      );
    }

    const mismatchingItems = toMismatchingItems(results, siteOutputPath);
    console.log("Mismatching Items (JSON):");
    mismatchingItems.forEach((item) => {
      const logData = {
        candidatePath: item.candidatePath,
        referencePath: item.referencePath,
        equal: item.equal,
        similarity: item.similarity ? `${item.similarity}%` : null,
        diffPixels: item.diffPixels,
      };
      console.log(JSON.stringify(logData, null, 2));
    });

    console.log("\nSummary:");
    console.log(`Total images: ${results.length}`);
    console.log(`Mismatched images: ${mismatchingItems.length}`);

    await renderHtmlReport({
      results: mismatchingItems,
      templatePath,
      outputPath,
    });

    const jsonReport = buildJsonReport({
      total: results.length,
      mismatchingItems,
    });
    fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`JSON report written to ${jsonReportPath}`);

    if (mismatchingItems.length > 0) {
      throw new Error(`Visual differences found in ${mismatchingItems.length} file(s).`);
    }
  } catch (error) {
    throw new Error(`Error generating VT report: ${error.message}`, { cause: error });
  }
}

export default main;
