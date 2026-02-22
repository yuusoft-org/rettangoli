import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const forbidden = "@rettangoli/fe/contracts";

const findings = [];

const walk = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      return;
    }
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      return;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    if (content.includes(forbidden)) {
      findings.push(path.relative(rootDir, fullPath));
    }
  });
};

walk(srcDir);

if (findings.length > 0) {
  console.error("Forbidden FE contracts subpath import found:");
  findings.forEach((relPath) => {
    console.error(`- ${relPath}`);
  });
  process.exit(1);
}

console.log("OK: no @rettangoli/fe/contracts imports found.");
