import { fake, record } from "../../trace.js";

record("import", "@rettangoli/check/cli");

export const check = fake("check");

// FAKE_CHECK_ERRORS=<n> and FAKE_CHECK_WARNINGS=<n> make the fake checker
// report that many diagnostics (default: a clean project).
const count = (name) => Number.parseInt(process.env[name] ?? "0", 10);

const runCheck = fake("runCheck", async () => {
  const error = count("FAKE_CHECK_ERRORS");
  const warn = count("FAKE_CHECK_WARNINGS");
  const severities = [...Array(error).fill("error"), ...Array(warn).fill("warn")];
  return {
    result: {
      summary: { total: error + warn, bySeverity: { error, warn } },
      diagnostics: severities.map((severity, index) => ({
        code: `FAKE-${index + 1}`,
        severity,
        message: `fake diagnostic ${index + 1}`,
        filePath: "fake.view.yaml",
        line: index + 1,
      })),
    },
    report: `[Check] fake report: ${error} error(s), ${warn} warning(s)`,
  };
});

export const createChecker = fake("createChecker", () => runCheck);
