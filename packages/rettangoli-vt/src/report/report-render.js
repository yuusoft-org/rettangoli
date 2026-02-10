import fs from "fs";
import { Liquid } from "liquidjs";

const engine = new Liquid();

engine.registerFilter("slug", (value) => {
  if (typeof value !== "string") return "";
  return value.toLowerCase().replace(/\s+/g, "-");
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
