import fs from "fs";
import { Liquid } from "liquidjs";
import { deriveAnchorId } from "../section-page-key.js";

const engine = new Liquid();

engine.registerFilter("slug", (value, fallbackValue) => {
  return deriveAnchorId(value, fallbackValue);
});

export async function renderHtmlReport({ results, templatePath, outputPath }) {
  try {
    const templateContent = fs.readFileSync(templatePath, "utf8");
    const renderedHtml = await engine.parseAndRender(templateContent, {
      files: results,
    });
    fs.writeFileSync(outputPath, renderedHtml);
    console.log(`Report generated successfully at ${outputPath}`);
  } catch (error) {
    throw new Error(`Failed to generate HTML report: ${error.message}`, { cause: error });
  }
}
