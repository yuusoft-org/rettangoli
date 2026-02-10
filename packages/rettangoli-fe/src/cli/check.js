import path from "node:path";
import {
  analyzeComponentDirs,
  formatContractFailureReport,
} from "./contracts.js";

const checkRettangoliFrontend = (options = {}) => {
  const {
    cwd = process.cwd(),
    dirs = ["./example"],
    format = "text",
  } = options;
  const outputFormat = format === "json" ? "json" : "text";

  const resolvedDirs = dirs.map((dir) => path.resolve(cwd, dir));
  const { errors, summary, index } = analyzeComponentDirs({ dirs: resolvedDirs });

  if (errors.length > 0) {
    if (outputFormat === "json") {
      console.log(JSON.stringify({
        ok: false,
        prefix: "[Check]",
        summary,
        errors,
      }, null, 2));
    } else {
      console.error(formatContractFailureReport({
        errorPrefix: "[Check]",
        errors,
      }));
    }
    process.exitCode = 1;
    return;
  }

  const componentCount = Object.values(index).reduce((count, categoryComponents) => {
    return count + Object.keys(categoryComponents).length;
  }, 0);

  if (outputFormat === "json") {
    console.log(JSON.stringify({
      ok: true,
      prefix: "[Check]",
      componentCount,
      summary,
    }, null, 2));
    return;
  }

  console.log(`[Check] Component contracts passed for ${componentCount} component(s).`);
};

export default checkRettangoliFrontend;
