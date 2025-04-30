import { cp, rm } from "node:fs/promises";
import {
  generateHtml,
  startWebServer,
  takeScreenshots,
  generateOverview,
} from "./common.js";

/**
 * Main function that orchestrates the entire process
 */
async function main() {
  await rm("./viz/_site", { recursive: true, force: true });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await cp("./viz/static", "./viz/_site", { recursive: true });

  // Generate HTML files
  const generatedFiles = await generateHtml(
    "./specs",
    "./viz/templates/default.html",
    "./viz/_site/artifacts"
  );

  const configData = {
    title: "Rettangoli Test Suitxxxe",
    sections: [
      {
        title: "View",
        files: "specs/view",
      },
      {
        title: "Text",
        files: "specs/text",
      },
      {
        title: "Button",
        files: "specs/button",
      },
      {
        title: "Image",
        files: "specs/image",
      },
      {
        title: "Svg",
        files: "specs/svg",
      },
      {
        title: "Input",
        files: "specs/input",
      },
      {
        title: "Textarea",
        files: "specs/textarea",
      },
      {
        title: "Select",
        files: "specs/select",
      },
      {
        title: "Popover",
        files: "specs/popover",
      },
      {
        title: "Sidebar",
        files: "specs/sidebar",
      },
      {
        title: "Page-Outline",
        files: "specs/page-outline",
      },
      {
        title: "Navbar",
        files: "specs/navbar",
      },
    ],
  };

  // Generate overview page with all files
  generateOverview(
    generatedFiles,
    "./viz/templates/index.html",
    "./viz/_site/index.html",
    configData
  );

  // Start web server
  const server = startWebServer("./viz/_site/artifacts", "./viz/_site", 3001);

  try {
    // Take screenshots with specified concurrency
    await takeScreenshots(
      generatedFiles,
      "http://localhost:3001",
      "./viz/_site/artifacts/screenshots",
      24
    );
  } finally {
    // Stop server
    server.stop();
    console.log("Server stopped");
  }
}

export default main;
