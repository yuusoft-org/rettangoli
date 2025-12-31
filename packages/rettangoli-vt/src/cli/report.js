import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Liquid } from "liquidjs";
import { cp } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import sharp from "sharp";

const libraryTemplatesPath = new URL('./templates', import.meta.url).pathname;

// Initialize Liquid engine
const engine = new Liquid();

// Add custom filter to convert string to lowercase and replace spaces with hyphens
engine.registerFilter("slug", (value) => {
  if (typeof value !== "string") return "";
  return value.toLowerCase().replace(/\s+/g, "-");
});

// Recursively get all files in a directory
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

function extractParts(p) {
  const dir = path.dirname(p);
  const filename = path.basename(p, '.webp');
  const lastHyphenIndex = filename.lastIndexOf('-');

  if (lastHyphenIndex > -1) {
    const suffix = filename.substring(lastHyphenIndex + 1);
    const number = parseInt(suffix);

    if (!isNaN(number) && String(number) === suffix) {
      const name = path.join(dir, filename.substring(0, lastHyphenIndex));
      return { name, number };
    }
  }
  // -1 is for the first file (as it will result in the first index when sorting)
  return { name: path.join(dir, filename), number: -1 };
}

function sortPaths(a, b) {
  const partsA = extractParts(a);
  const partsB = extractParts(b);

  if (partsA.name < partsB.name) return -1;
  if (partsA.name > partsB.name) return 1;

  return partsA.number - partsB.number;
}

async function calculateImageHash(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    return hash;
  } catch (error) {
    console.error(`Error calculating hash for ${imagePath}:`, error);
    return null;
  }
}

async function compareImagesMd5(artifactPath, goldPath) {
  try {
    const artifactHash = await calculateImageHash(artifactPath);
    const goldHash = await calculateImageHash(goldPath);

    if (artifactHash === null || goldHash === null) {
      return { equal: false, error: true };
    }

    return { equal: artifactHash === goldHash, error: false };
  } catch (error) {
    console.error("Error comparing images:", error);
    return { equal: false, error: true };
  }
}

async function compareImagesPixelmatch(artifactPath, goldPath, diffPath, options = {}) {
  const { colorThreshold = 0.1, diffThreshold = 0.3 } = options;

  try {
    // Load images and convert to raw RGBA using sharp
    const [artifactData, goldData] = await Promise.all([
      sharp(artifactPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(goldPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);

    const { width, height } = artifactData.info;
    const goldWidth = goldData.info.width;
    const goldHeight = goldData.info.height;
    const totalPixels = width * height;

    // If dimensions don't match, images are different
    if (width !== goldWidth || height !== goldHeight) {
      return { equal: false, error: false, diffPixels: -1, totalPixels, similarity: 0 };
    }

    // Create diff image buffer
    const diffBuffer = Buffer.alloc(totalPixels * 4);

    const diffPixels = pixelmatch(
      artifactData.data,
      goldData.data,
      diffBuffer,
      width,
      height,
      { threshold: colorThreshold }
    );

    const diffPercent = (diffPixels / totalPixels) * 100;
    const similarity = (100 - diffPercent).toFixed(2);
    const equal = diffPercent < diffThreshold;

    // Save diff image if not equal
    if (!equal && diffPath) {
      fs.mkdirSync(path.dirname(diffPath), { recursive: true });
      await sharp(diffBuffer, { raw: { width, height, channels: 4 } })
        .png()
        .toFile(diffPath);
    }

    return { equal, error: false, diffPixels, totalPixels, similarity };
  } catch (error) {
    console.error("Error comparing images with pixelmatch:", error);
    return { equal: false, error: true };
  }
}

async function compareImages(artifactPath, goldPath, method = 'pixelmatch', diffPath = null, options = {}) {
  if (method === 'md5') {
    return compareImagesMd5(artifactPath, goldPath);
  }
  return compareImagesPixelmatch(artifactPath, goldPath, diffPath, options);
}

async function generateReport({ results, templatePath, outputPath }) {
  try {
    // Read the template file
    const templateContent = fs.readFileSync(templatePath, "utf8");

    // Render the template with the results data
    const renderedHtml = await engine.parseAndRender(templateContent, {
      files: results,
    });

    // Write the rendered HTML to the output file
    fs.writeFileSync(outputPath, renderedHtml);

    console.log(`Report generated successfully at ${outputPath}`);
  } catch (error) {
    console.error("Error generating report:", error);
  }
}

async function main(options = {}) {
  const {
    vtPath = "./vt",
    compareMethod = 'pixelmatch',
    colorThreshold = 0.1,
    diffThreshold = 0.3,
  } = options;

  const siteOutputPath = path.join(".rettangoli", "vt", "_site");
  const candidateDir = path.join(siteOutputPath, "candidate");
  const diffDir = path.join(siteOutputPath, "diff");
  const originalReferenceDir = path.join(vtPath, "reference");
  const siteReferenceDir = path.join(siteOutputPath, "reference");
  const templatePath = path.join(libraryTemplatesPath, "report.html");
  const outputPath = path.join(siteOutputPath, "report.html");

  console.log(`Comparison method: ${compareMethod}`);
  if (compareMethod === 'pixelmatch') {
    console.log(`  color threshold: ${colorThreshold}, diff threshold: ${diffThreshold}%`);
  }

  if (!fs.existsSync(originalReferenceDir)) {
    console.log("Reference directory does not exist, creating it...");
    fs.mkdirSync(originalReferenceDir, { recursive: true });
  }

  // Create diff directory for diffs
  if (compareMethod === 'pixelmatch' && !fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }

  // Copy reference directory to _site for web access
  if (fs.existsSync(originalReferenceDir)) {
    console.log("Copying reference directory to _site...");
    await cp(originalReferenceDir, siteReferenceDir, { recursive: true });
  }

  try {
    // Get all WebP files recursively (only compare screenshots, not HTML)
    const candidateFiles = getAllFiles(candidateDir).filter(file => file.endsWith('.webp'));
    const referenceFiles = getAllFiles(originalReferenceDir).filter(file => file.endsWith('.webp'));

    console.log("Candidate Screenshots:", candidateFiles.length);
    console.log("Reference Screenshots:", referenceFiles.length);

    const results = [];

    // Get relative paths for comparison
    const candidateRelativePaths = candidateFiles.map((file) =>
      path.relative(candidateDir, file)
    );
    const referenceRelativePaths = referenceFiles.map((file) =>
      path.relative(originalReferenceDir, file)
    );

    // Get all unique paths from both directories
    const allPaths = [
      ...new Set([...candidateRelativePaths, ...referenceRelativePaths]),
    ];

    allPaths.sort(sortPaths);

    for (const relativePath of allPaths) {
      const candidatePath = path.join(candidateDir, relativePath);
      const referencePath = path.join(originalReferenceDir, relativePath);
      const siteReferencePath = path.join(siteReferenceDir, relativePath);
      const diffPath = path.join(diffDir, relativePath.replace('.webp', '-diff.png'));

      const candidateExists = fs.existsSync(candidatePath);
      const referenceExists = fs.existsSync(referencePath);

      // Skip if neither file exists (shouldn't happen, but just in case)
      if (!candidateExists && !referenceExists) continue;

      let equal = true;
      let error = false;
      let similarity = null;
      let diffPixels = null;

      // Compare images if both exist
      if (candidateExists && referenceExists) {
        // Ensure diff directory exists
        const diffDirPath = path.dirname(diffPath);
        if (!fs.existsSync(diffDirPath)) {
          fs.mkdirSync(diffDirPath, { recursive: true });
        }

        const comparison = await compareImages(
          candidatePath,
          referencePath,
          compareMethod,
          diffPath,
          { colorThreshold, diffThreshold }
        );
        equal = comparison.equal;
        error = comparison.error;
        similarity = comparison.similarity;
        diffPixels = comparison.diffPixels;
      } else {
        equal = false; // If one file is missing, they're not equal
      }

      if (!error) {
        results.push({
          candidatePath: candidateExists ? candidatePath : null,
          referencePath: referenceExists ? siteReferencePath : null, // Use site reference path for HTML report
          path: relativePath,
          equal: candidateExists && referenceExists ? equal : false,
          similarity,
          diffPixels,
          onlyInCandidate: candidateExists && !referenceExists,
          onlyInReference: !candidateExists && referenceExists,
        });
      }
    }

    const mismatchingItems = results
      .filter(
        (result) =>
          !result.equal || result.onlyInCandidate || result.onlyInReference
      )
      .map((result) => {
        return {
          candidatePath: result.candidatePath
            ? path.relative(siteOutputPath, result.candidatePath)
            : null,
          referencePath: result.referencePath
            ? path.relative(siteOutputPath, result.referencePath)
            : null,
          equal: result.equal,
          similarity: result.similarity,
          diffPixels: result.diffPixels,
          onlyInCandidate: result.onlyInCandidate,
          onlyInReference: result.onlyInReference,
        };
      });
    console.log("Mismatching Items (JSON):");
    mismatchingItems.forEach(item => {
      const logData = {
        candidatePath: item.candidatePath,
        referencePath: item.referencePath,
        equal: item.equal,
        similarity: item.similarity ? `${item.similarity}%` : null,
        diffPixels: item.diffPixels,
      };
      console.log(JSON.stringify(logData, null, 2));
    });

    // Summary at the end
    console.log(`\nSummary:`);
    console.log(`Total images: ${results.length}`);
    console.log(`Mismatched images: ${mismatchingItems.length}`);

    // Generate HTML report
    await generateReport({
      results: mismatchingItems,
      templatePath,
      outputPath,
    });
    if(mismatchingItems.length > 0){
      console.error("Error: there are more than 0 mismatching item.")
      process.exit(1);
    }
  } catch (error) {
    console.error("Error reading directories:", error);
  }
}

export default main;
