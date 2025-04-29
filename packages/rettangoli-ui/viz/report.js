import fs from "fs";
import path from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { Liquid } from "liquidjs";
import { cp } from "node:fs/promises";

const artifactsScreenshotsDir = "./viz/_site/artifacts/screenshots";
const goldScreenshotsDir = "./viz/gold/screenshots";
const staticGoldScreenshotsDir = "./viz/_site/gold/screenshots";
const templatePath = "./viz/templates/report.html";
const outputPath = "./viz/_site/report.html";

// Initialize Liquid engine
const engine = new Liquid();

// Add custom filter to convert string to lowercase and replace spaces with hyphens
engine.registerFilter('slug', (value) => {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/\s+/g, '-');
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

async function compareImages(artifactPath, goldPath) {
  return new Promise((resolve) => {
    const img1 = fs
      .createReadStream(artifactPath)
      .on("error", () => resolve({ similarity: 0, error: true }))
      .pipe(new PNG())
      .on("parsed", doneReading);

    const img2 = fs
      .createReadStream(goldPath)
      .on("error", () => resolve({ similarity: 0, error: true }))
      .pipe(new PNG())
      .on("parsed", doneReading);

    let filesRead = 0;

    function doneReading() {
      if (++filesRead < 2) return;

      try {
        // Create a diff PNG
        const diffPng = new PNG({ width: img1.width, height: img1.height });

        const diff = pixelmatch(
          img1.data,
          img2.data,
          diffPng.data,
          img1.width,
          img1.height,
          { threshold: 0.1 }
        );
        const totalPixels = img1.width * img1.height;
        const similarity = 1 - diff / totalPixels;
        resolve({ similarity, error: false });
      } catch (error) {
        console.error("Error comparing images:", error);
        resolve({ similarity: 0, error: true });
      }
    }
  });
}

async function generateReport(results) {
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

async function main() {
  try {
    // Get all files recursively
    const artifactsFiles = getAllFiles(artifactsScreenshotsDir);
    const goldFiles = getAllFiles(goldScreenshotsDir);

    console.log("Artifacts Screenshots:", artifactsFiles.length);
    console.log("Gold Screenshots:", goldFiles.length);

    const results = [];

    // Get relative paths for comparison
    const artifactsRelativePaths = artifactsFiles.map((file) =>
      path.relative(artifactsScreenshotsDir, file)
    );
    const goldRelativePaths = goldFiles.map((file) =>
      path.relative(goldScreenshotsDir, file)
    );

    // Get all unique paths from both directories
    const allPaths = [...new Set([...artifactsRelativePaths, ...goldRelativePaths])];

    for (const relativePath of allPaths) {
      const artifactPath = path.join(artifactsScreenshotsDir, relativePath);
      const goldPath = path.join(goldScreenshotsDir, relativePath);
      
      const artifactExists = fs.existsSync(artifactPath);
      const goldExists = fs.existsSync(goldPath);
      
      // Skip if neither file exists (shouldn't happen, but just in case)
      if (!artifactExists && !goldExists) continue;
      
      let similarity = 0;
      let error = false;
      
      // Compare images if both exist
      if (artifactExists && goldExists) {
        const comparison = await compareImages(artifactPath, goldPath);
        similarity = comparison.similarity;
        error = comparison.error;
      }

      if (!error) {
        results.push({
          artifactPath: artifactExists ? artifactPath : null,
          goldPath: goldExists ? goldPath : null,
          path: relativePath,
          similarity: artifactExists && goldExists ? similarity : 0,
          onlyInArtifacts: artifactExists && !goldExists,
          onlyInGold: !artifactExists && goldExists,
        });
      }
    }

    console.log("Comparison Results:");
    console.log(results);

    const mismatchingItems = results
      .filter((result) => result.similarity < 1 || result.onlyInArtifacts || result.onlyInGold)
      .map((result) => {
        return {
          artifactPath: result.artifactPath ? result.artifactPath.replace("viz/_site/", "") : null,
          goldPath: result.goldPath ? result.goldPath.replace("viz/", "") : null,
          similarity: result.similarity,
          onlyInArtifacts: result.onlyInArtifacts,
          onlyInGold: result.onlyInGold,
        };
      });
    console.log("Mismatching Items:");
    console.log(mismatchingItems);
    // Generate HTML report
    await generateReport(mismatchingItems);

    // Copy artifacts to gold
    console.log("Copying artifacts to gold...");
    await cp(goldScreenshotsDir, staticGoldScreenshotsDir, { recursive: true });
  } catch (error) {
    console.error("Error reading directories:", error);
  }
}

export default main;
