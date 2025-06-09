import fs from "fs";
import path from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
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
  const { vizPath = "./viz" } = options;

  const siteOutputPath = path.join(".rettangoli", "vt", "_site");
  const candidateDir = path.join(siteOutputPath, "candidate");
  const referenceDir = path.join(vizPath, "reference");
  const templatePath = path.join(libraryTemplatesPath, "report.html");
  const outputPath = path.join(siteOutputPath, "report.html");

  if (!fs.existsSync(referenceDir)) {
    console.log("Reference directory does not exist, creating it...");
    fs.mkdirSync(referenceDir, { recursive: true });
  }

  try {
    // Get all PNG files recursively (only compare screenshots, not HTML)
    const candidateFiles = getAllFiles(candidateDir).filter(file => file.endsWith('.png'));
    const referenceFiles = getAllFiles(referenceDir).filter(file => file.endsWith('.png'));

    console.log("Candidate Screenshots:", candidateFiles.length);
    console.log("Reference Screenshots:", referenceFiles.length);

    const results = [];

    // Get relative paths for comparison
    const candidateRelativePaths = candidateFiles.map((file) =>
      path.relative(candidateDir, file)
    );
    const referenceRelativePaths = referenceFiles.map((file) =>
      path.relative(referenceDir, file)
    );

    // Get all unique paths from both directories
    const allPaths = [
      ...new Set([...candidateRelativePaths, ...referenceRelativePaths]),
    ];

    for (const relativePath of allPaths) {
      const candidatePath = path.join(candidateDir, relativePath);
      const referencePath = path.join(referenceDir, relativePath);

      const candidateExists = fs.existsSync(candidatePath);
      const referenceExists = fs.existsSync(referencePath);

      // Skip if neither file exists (shouldn't happen, but just in case)
      if (!candidateExists && !referenceExists) continue;

      let similarity = 0;
      let error = false;

      // Compare images if both exist
      if (candidateExists && referenceExists) {
        const comparison = await compareImages(candidatePath, referencePath);
        similarity = comparison.similarity;
        error = comparison.error;
      }

      if (!error) {
        results.push({
          candidatePath: candidateExists ? candidatePath : null,
          referencePath: referenceExists ? referencePath : null,
          path: relativePath,
          similarity: candidateExists && referenceExists ? similarity : 0,
          onlyInCandidate: candidateExists && !referenceExists,
          onlyInReference: !candidateExists && referenceExists,
        });
      }
    }

    const mismatchingItems = results
      .filter(
        (result) =>
          result.similarity < 1 || result.onlyInCandidate || result.onlyInReference
      )
      .map((result) => {
        return {
          candidatePath: result.candidatePath
            ? path.relative(".", result.candidatePath)
            : null,
          referencePath: result.referencePath
            ? path.relative(".", result.referencePath)
            : null,
          similarity: result.similarity,
          onlyInCandidate: result.onlyInCandidate,
          onlyInReference: result.onlyInReference,
        };
      });
    console.log("Mismatching Items:");
    console.log(mismatchingItems);
    // Generate HTML report
    await generateReport({
      results: mismatchingItems,
      templatePath,
      outputPath,
    });
  } catch (error) {
    console.error("Error reading directories:", error);
  }
}

export default main;
