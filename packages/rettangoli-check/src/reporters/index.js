import { formatJsonReport } from "./json.js";
import { formatSarifReport } from "./sarif.js";
import { formatTextReport } from "./text.js";

export const formatReport = ({ format = "text", result, warnAsError = false }) => {
  if (format === "json") {
    return formatJsonReport({ result, warnAsError });
  }
  if (format === "sarif") {
    return formatSarifReport({ result });
  }
  return formatTextReport({ result, warnAsError });
};
