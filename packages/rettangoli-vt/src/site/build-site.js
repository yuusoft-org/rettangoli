import { existsSync } from "node:fs";
import { cp } from "node:fs/promises";
import path from "node:path";
import { generateHtml, generateOverview } from "../common.js";

// The site build shared by `vt generate` and watch mode. The CLI clears the candidate folder and
// builds in place; watch builds in a stage directory and swaps it in.

// The project's vt/templates/default.html and index.html win over the library's.
export function resolveTemplatePaths(vtPath, libraryTemplatesPath) {
  const templatesPath = path.join(vtPath, "templates");
  const resolveTemplate = (name) =>
    existsSync(path.join(templatesPath, name))
      ? path.join(templatesPath, name)
      : path.join(libraryTemplatesPath, name);
  return {
    templatesPath,
    defaultTemplatePath: resolveTemplate("default.html"),
    indexTemplatePath: resolveTemplate("index.html"),
  };
}

// Library static files first, then the project's vt/static on top.
export async function copySiteStatic(targetDir, { libraryStaticPath, userStaticPath }) {
  await cp(libraryStaticPath, targetDir, { recursive: true });
  if (existsSync(userStaticPath)) {
    await cp(userStaticPath, targetDir, { recursive: true });
  }
}

// Renders every spec into candidateDir, then the overview pages into siteDir. `beforeOverview`
// runs between the two with the generated files. With throwOnRenderError, an overview template
// error is thrown instead of being written as an error page.
export async function renderSite({
  specsPath,
  candidateDir,
  siteDir,
  templatePaths,
  vtPath,
  configData,
  logger = console,
  throwOnRenderError = false,
  beforeOverview,
}) {
  const generatedFiles = await generateHtml(
    specsPath,
    templatePaths.defaultTemplatePath,
    candidateDir,
    {
      defaultTemplate: templatePaths.defaultTemplatePath,
      logger,
      vtPath,
    },
  );
  beforeOverview?.(generatedFiles);
  generateOverview(
    generatedFiles,
    templatePaths.indexTemplatePath,
    path.join(siteDir, "index.html"),
    configData,
    { logger, throwOnRenderError },
  );
  return generatedFiles;
}
