import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const splitShellLike = (value = "") => {
  const tokens = [];
  const tokenRegex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = tokenRegex.exec(value)) !== null) {
    tokens.push(match[1] || match[2] || match[3]);
  }
  return tokens;
};

const buildEditorCandidates = (explicitEditor) => {
  const candidates = [];

  if (explicitEditor && String(explicitEditor).trim()) {
    candidates.push(String(explicitEditor).trim());
  }

  const envEditors = [process.env.VISUAL, process.env.EDITOR]
    .filter((value) => value && String(value).trim());
  candidates.push(...envEditors);

  candidates.push("nvim", "vim", "vi", "nano");

  return [...new Set(candidates)];
};

const runEditorCommand = ({ editorCommand, filePath }) => {
  const parts = splitShellLike(editorCommand);
  if (parts.length === 0) {
    return {
      ok: false,
      reason: "Invalid editor command",
    };
  }

  const [command, ...args] = parts;
  const result = spawnSync(command, [...args, filePath], {
    stdio: "inherit",
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      return {
        ok: false,
        reason: "Editor executable not found",
      };
    }

    return {
      ok: false,
      reason: result.error.message,
    };
  }

  if (typeof result.status === "number" && result.status !== 0) {
    return {
      ok: false,
      reason: `Editor exited with status ${result.status}`,
    };
  }

  return {
    ok: true,
  };
};

export const openInExternalEditor = ({
  initialValue = "",
  fileName = "rtgl-content.md",
  editor,
} = {}) => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "rtgl-editor-"));
  const filePath = path.join(tempDir, fileName);

  try {
    writeFileSync(filePath, String(initialValue ?? ""), "utf8");

    const candidates = buildEditorCandidates(editor);
    let lastError = "No editor candidates available.";
    let usedEditor = null;

    for (const editorCommand of candidates) {
      const result = runEditorCommand({ editorCommand, filePath });
      if (result.ok) {
        usedEditor = editorCommand;
        const value = readFileSync(filePath, "utf8");
        return {
          ok: true,
          value,
          editor: usedEditor,
        };
      }
      lastError = result.reason || lastError;
    }

    return {
      ok: false,
      value: String(initialValue ?? ""),
      error: lastError,
      editor: usedEditor,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
};
