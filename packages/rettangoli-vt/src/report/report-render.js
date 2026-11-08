import fs from "fs";
import { createLiquidEngine } from "../render/liquid.js";

const engine = createLiquidEngine();

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
