import { readFileSync } from "node:fs";
import { load as loadYaml } from "js-yaml";
import path from "node:path";
import { extractCategoryAndComponent, getAllFiles } from "../commonBuild.js";
import {
  buildComponentContractIndex,
  formatContractErrors,
  validateComponentContractIndex,
} from "../core/contracts/componentFiles.js";

const checkRettangoliFrontend = (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ["./example"],
  } = options;

  const resolvedDirs = dirs.map((dir) => path.resolve(cwd, dir));
  const allFiles = getAllFiles(resolvedDirs).filter((filePath) => {
    return (
      filePath.endsWith(".store.js")
      || filePath.endsWith(".handlers.js")
      || filePath.endsWith(".methods.js")
      || filePath.endsWith(".constants.yaml")
      || filePath.endsWith(".schema.yaml")
      || filePath.endsWith(".view.yaml")
    );
  });

  const componentContractEntries = allFiles.map((filePath) => {
    const { category, component, fileType } = extractCategoryAndComponent(filePath);
    const entry = {
      category,
      component,
      fileType,
      filePath,
    };

    if (["view", "schema"].includes(fileType)) {
      entry.yamlObject = loadYaml(readFileSync(filePath, "utf8")) ?? {};
    }

    return entry;
  });

  const componentContractIndex = buildComponentContractIndex(componentContractEntries);
  const componentContractErrors = validateComponentContractIndex(componentContractIndex);

  if (componentContractErrors.length > 0) {
    throw new Error(
      `[Check] Component contract validation failed:\n${formatContractErrors(componentContractErrors).join("\n")}`,
    );
  }

  const componentCount = Object.values(componentContractIndex).reduce((count, categoryComponents) => {
    return count + Object.keys(categoryComponents).length;
  }, 0);

  console.log(`[Check] Component contracts passed for ${componentCount} component(s).`);
};

export default checkRettangoliFrontend;
