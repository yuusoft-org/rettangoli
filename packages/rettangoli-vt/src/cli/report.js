import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Liquid } from "liquidjs";
import { cp } from "node:fs/promises";

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

async function compareImages(artifactPath, goldPath) {
  try {
    const artifactHash = await calculateImageHash(artifactPath);
    const goldHash = await calculateImageHash(goldPath);

    if (artifactHash === null || goldHash === null) {
      return {
        equal: false,
        error: true,
      };
    }

    const equal = artifactHash === goldHash;

    return {
      equal,
      error: false,
    };
  } catch (error) {
    console.error("Error comparing images:", error);
    return {
      equal: false,
      error: true,
      diffBounds: null,
      diffClusters: null
    };
  }
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
  const { vtPath = "./vt", skipFiles = [] } = options;

  const siteOutputPath = path.join(".rettangoli", "vt", "_site");
  const candidateDir = path.join(siteOutputPath, "candidate");
  const originalReferenceDir = path.join(vtPath, "reference");
  const siteReferenceDir = path.join(siteOutputPath, "reference");
  const templatePath = path.join(libraryTemplatesPath, "report.html");
  const outputPath = path.join(siteOutputPath, "report.html");

  if (!fs.existsSync(originalReferenceDir)) {
    console.log("Reference directory does not exist, creating it...");
    fs.mkdirSync(originalReferenceDir, { recursive: true });
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

    const normalizedSkipFiles = skipFiles.map(f => f.replace(/\\/g, '/'));
    for (const relativePath of allPaths) {
      const normalizedPath = relativePath.replace(/\\/g, '/');
      if (normalizedSkipFiles.some(skipPattern => {
        const pattern = skipPattern.replace(/\*/g, '.*');
        const regex = new RegExp(pattern + '(\\.webp)?$');
        return regex.test(normalizedPath);
      })) {
        console.log(`Skipping file: ${relativePath}`);
        results.push({
          equal: true,
        })
        continue;
      }
      const candidatePath = path.join(candidateDir, relativePath);
      const referencePath = path.join(originalReferenceDir, relativePath);
      const siteReferencePath = path.join(siteReferenceDir, relativePath);

      const candidateExists = fs.existsSync(candidatePath);
      const referenceExists = fs.existsSync(referencePath);

      // Skip if neither file exists (shouldn't happen, but just in case)
      if (!candidateExists && !referenceExists) continue;

      let equal = true;
      let error = false;

      // Compare images if both exist
      if (candidateExists && referenceExists) {
        const comparison = await compareImages(candidatePath, referencePath);
        equal = comparison.equal;
        error = comparison.error;
      } else {
        equal = false; // If one file is missing, they're not equal
      }

      if (!error) {
        results.push({
          candidatePath: candidateExists ? candidatePath : null,
          referencePath: referenceExists ? siteReferencePath : null, // Use site reference path for HTML report
          path: relativePath,
          equal: candidateExists && referenceExists ? equal : false,
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
          onlyInCandidate: result.onlyInCandidate,
          onlyInReference: result.onlyInReference,
        };
      });
    console.log("Mismatching Items (JSON):");
    // mismatchingItems.forEach(item => {
    //   const logData = {
    //     candidatePath: item.candidatePath,
    //     referencePath: item.referencePath,
    //     equal: item.equal,
    //   };
    //   console.log(JSON.stringify(logData, null, 2));
    // });
    
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
