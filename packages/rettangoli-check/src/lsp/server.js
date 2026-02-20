import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { analyzeProject } from "../core/analyze.js";
import { applyDiagnosticFixes } from "../diagnostics/autofix.js";
import { createJsonRpcTransport } from "./protocol.js";
import {
  buildWorkspaceSymbolIndex,
  filePathToUri,
  findWordAtPosition,
  uriToFilePath,
} from "./symbolIndex.js";

const LSP_DIAGNOSTIC_SEVERITY = {
  error: 1,
  warn: 2,
};

const toLspRange = ({
  line,
  column,
  endLine,
  endColumn,
}) => {
  const startLine = Number.isInteger(line) ? Math.max(0, line - 1) : 0;
  const startCharacter = Number.isInteger(column) ? Math.max(0, column - 1) : 0;
  const finishLine = Number.isInteger(endLine) ? Math.max(0, endLine - 1) : startLine;
  const finishCharacter = Number.isInteger(endColumn)
    ? Math.max(0, endColumn - 1)
    : Math.max(startCharacter + 1, startCharacter);

  return {
    start: {
      line: startLine,
      character: startCharacter,
    },
    end: {
      line: finishLine,
      character: finishCharacter,
    },
  };
};

const toLspDiagnostic = (diagnostic = {}) => {
  const relatedInformation = Array.isArray(diagnostic.related)
    ? diagnostic.related
      .filter((entry) => entry && entry.filePath && entry.filePath !== "unknown")
      .map((entry) => ({
        location: {
          uri: filePathToUri(entry.filePath),
          range: toLspRange({
            line: entry.line,
            column: entry.column,
            endLine: entry.endLine,
            endColumn: entry.endColumn,
          }),
        },
        message: entry.message || "related",
      }))
    : [];

  return {
    range: toLspRange({
      line: diagnostic.line,
      column: diagnostic.column,
      endLine: diagnostic.endLine,
      endColumn: diagnostic.endColumn,
    }),
    severity: LSP_DIAGNOSTIC_SEVERITY[diagnostic.severity] || 1,
    code: diagnostic.code || "RTGL-CHECK-UNKNOWN",
    source: "@rettangoli/check",
    message: diagnostic.message || "Unknown diagnostic",
    ...(relatedInformation.length > 0 ? { relatedInformation } : {}),
  };
};

const compareLocations = (left = {}, right = {}) => (
  String(left.uri || "").localeCompare(String(right.uri || ""))
  || (left?.range?.start?.line || 0) - (right?.range?.start?.line || 0)
  || (left?.range?.start?.character || 0) - (right?.range?.start?.character || 0)
);

const dedupeLocations = (locations = []) => {
  const seen = new Set();
  const deduped = [];
  locations.forEach((location) => {
    const key = [
      location.uri,
      location?.range?.start?.line || 0,
      location?.range?.start?.character || 0,
      location?.range?.end?.line || 0,
      location?.range?.end?.character || 0,
    ].join(":");
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(location);
  });
  return deduped.sort(compareLocations);
};

export const runLspServer = async ({
  cwd = process.cwd(),
  dirs = ["./src/components"],
  input = process.stdin,
  output = process.stdout,
} = {}) => {
  const openDocuments = new Map();
  const incrementalState = { componentCache: new Map() };
  let shutdownRequested = false;
  let lastAnalysis = null;
  let lastPublishedUris = new Set();
  let refreshRunning = false;
  let refreshQueued = false;
  let transport = null;

  const writeDocumentToDisk = ({ uri, text }) => {
    const filePath = uriToFilePath(uri);
    if (!filePath) {
      return;
    }
    if (!path.resolve(filePath).startsWith(path.resolve(cwd))) {
      return;
    }
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, text, "utf8");
  };

  const publishDiagnostics = (analysis = {}) => {
    const nextByUri = new Map();
    (analysis.diagnostics || []).forEach((diagnostic) => {
      if (!diagnostic.filePath || diagnostic.filePath === "unknown") {
        return;
      }
      const uri = filePathToUri(diagnostic.filePath);
      const existing = nextByUri.get(uri) || [];
      existing.push(toLspDiagnostic(diagnostic));
      nextByUri.set(uri, existing);
    });

    const candidateUris = new Set([...lastPublishedUris, ...nextByUri.keys(), ...openDocuments.keys()]);
    candidateUris.forEach((uri) => {
      transport.sendNotification("textDocument/publishDiagnostics", {
        uri,
        diagnostics: nextByUri.get(uri) || [],
      });
    });
    lastPublishedUris = new Set(candidateUris);
  };

  const refreshWorkspace = async () => {
    if (refreshRunning) {
      refreshQueued = true;
      return;
    }

    refreshRunning = true;
    try {
      const analysis = await analyzeProject({
        cwd,
        dirs,
        workspaceRoot: cwd,
        includeYahtml: true,
        includeExpression: true,
        includeSemantic: true,
        incrementalState,
      });
      lastAnalysis = analysis;
      publishDiagnostics(analysis);
    } finally {
      refreshRunning = false;
      if (refreshQueued) {
        refreshQueued = false;
        await refreshWorkspace();
      }
    }
  };

  const getIndex = () => {
    return buildWorkspaceSymbolIndex({
      cwd,
      dirs,
      openDocuments,
    });
  };

  const findWordForRequest = ({ uri, position = {} }) => {
    const doc = openDocuments.get(uri);
    if (!doc) {
      const filePath = uriToFilePath(uri);
      return {
        word: "",
        text: "",
        filePath,
      };
    }
    return {
      word: findWordAtPosition({
        text: doc.text,
        line: position.line,
        character: position.character,
      }),
      text: doc.text,
      filePath: uriToFilePath(uri),
    };
  };

  const createQuickFixActions = ({ uri, range }) => {
    if (!lastAnalysis) {
      return [];
    }
    const filePath = uriToFilePath(uri);
    if (!filePath) {
      return [];
    }

    const diagnostics = (lastAnalysis.diagnostics || []).filter((diagnostic) => (
      diagnostic.filePath === filePath
      && diagnostic.fix
      && diagnostic.fix.safe !== false
    ));

    return diagnostics.map((diagnostic) => ({
      title: `Apply safe fix (${diagnostic.code})`,
      kind: "quickfix",
      command: {
        title: "Apply safe autofix",
        command: "rtgl.applySafeAutofix",
        arguments: [{
          code: diagnostic.code,
          filePath: diagnostic.filePath,
          line: diagnostic.line,
        }],
      },
    }));
  };

  transport = createJsonRpcTransport({
    input,
    output,
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[LSP] ${message}\n`);
    },
    onRequest: async (message) => {
      const params = message.params || {};
      const method = message.method;

      if (method === "initialize") {
        await refreshWorkspace();
        return {
          capabilities: {
            textDocumentSync: 1,
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
            renameProvider: true,
            codeActionProvider: true,
            executeCommandProvider: {
              commands: ["rtgl.applySafeAutofix"],
            },
          },
          serverInfo: {
            name: "@rettangoli/check-lsp",
            version: "1.0.0",
          },
        };
      }

      if (method === "shutdown") {
        shutdownRequested = true;
        return null;
      }

      if (method === "textDocument/hover") {
        const uri = params?.textDocument?.uri;
        const { word } = findWordForRequest({
          uri,
          position: params.position || {},
        });
        if (!word) {
          return null;
        }
        const index = getIndex();
        const definitionCount = (index.definitions.get(word) || []).length;
        const referenceCount = (index.references.get(word) || []).length;
        return {
          contents: {
            kind: "markdown",
            value: `**${word}**\n\nDefinitions: ${definitionCount}\nReferences: ${referenceCount}`,
          },
        };
      }

      if (method === "textDocument/definition") {
        const uri = params?.textDocument?.uri;
        const { word } = findWordForRequest({
          uri,
          position: params.position || {},
        });
        if (!word) {
          return null;
        }
        const index = getIndex();
        const definitions = dedupeLocations(index.definitions.get(word) || []);
        return definitions[0] || null;
      }

      if (method === "textDocument/references") {
        const uri = params?.textDocument?.uri;
        const includeDeclaration = params?.context?.includeDeclaration !== false;
        const { word } = findWordForRequest({
          uri,
          position: params.position || {},
        });
        if (!word) {
          return [];
        }
        const index = getIndex();
        const refs = dedupeLocations(index.references.get(word) || []);
        if (includeDeclaration) {
          return refs;
        }
        const defs = new Set((index.definitions.get(word) || []).map((location) => (
          `${location.uri}:${location.range.start.line}:${location.range.start.character}`
        )));
        return refs.filter((location) => !defs.has(
          `${location.uri}:${location.range.start.line}:${location.range.start.character}`,
        ));
      }

      if (method === "textDocument/rename") {
        const uri = params?.textDocument?.uri;
        const newName = String(params?.newName || "");
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(newName)) {
          throw {
            code: -32602,
            message: `Invalid rename target '${newName}'.`,
          };
        }

        const { word } = findWordForRequest({
          uri,
          position: params.position || {},
        });
        if (!word) {
          return null;
        }
        if (word.startsWith("handle") && !newName.startsWith("handle")) {
          throw {
            code: -32602,
            message: "Lifecycle/handler symbols must preserve the 'handle' prefix for safe rename.",
          };
        }

        const index = getIndex();
        const refs = dedupeLocations(index.references.get(word) || []);
        const changes = {};
        refs.forEach((location) => {
          const edits = changes[location.uri] || [];
          edits.push({
            range: location.range,
            newText: newName,
          });
          changes[location.uri] = edits;
        });
        return {
          changes,
        };
      }

      if (method === "textDocument/codeAction") {
        const uri = params?.textDocument?.uri;
        const actions = createQuickFixActions({
          uri,
          range: params?.range || {},
        });
        if (actions.length > 0) {
          return actions;
        }
        return [
          {
            title: "Apply safe autofix (workspace)",
            kind: "quickfix",
            command: {
              title: "Apply safe autofix",
              command: "rtgl.applySafeAutofix",
              arguments: [],
            },
          },
        ];
      }

      if (method === "workspace/executeCommand") {
        const command = String(params?.command || "");
        if (command !== "rtgl.applySafeAutofix") {
          return null;
        }
        const args = Array.isArray(params?.arguments) ? params.arguments : [];
        const target = args[0] || {};
        const candidates = (lastAnalysis?.diagnostics || []).filter((diagnostic) => (
          diagnostic.code === target.code
          && diagnostic.filePath === target.filePath
          && diagnostic.line === target.line
          && diagnostic.fix
          && diagnostic.fix.safe !== false
        ));
        const fixResult = applyDiagnosticFixes({
          diagnostics: candidates,
          dryRun: false,
          minConfidence: 0.9,
          includePatchText: false,
        });
        await refreshWorkspace();
        return {
          appliedCount: fixResult.appliedCount,
          skippedCount: fixResult.skippedCount,
        };
      }

      return null;
    },
    onNotification: async (message) => {
      const params = message.params || {};
      const method = message.method;

      if (method === "initialized") {
        return;
      }

      if (method === "exit") {
        process.exit(shutdownRequested ? 0 : 1);
      }

      if (method === "textDocument/didOpen") {
        const uri = params?.textDocument?.uri;
        const text = String(params?.textDocument?.text || "");
        if (!uri) {
          return;
        }
        openDocuments.set(uri, {
          text,
          version: Number(params?.textDocument?.version || 0),
        });
        writeDocumentToDisk({ uri, text });
        await refreshWorkspace();
        return;
      }

      if (method === "textDocument/didChange") {
        const uri = params?.textDocument?.uri;
        if (!uri) {
          return;
        }
        const previous = openDocuments.get(uri) || { text: "", version: 0 };
        const changes = Array.isArray(params?.contentChanges) ? params.contentChanges : [];
        if (changes.length === 0) {
          return;
        }
        const latest = changes[changes.length - 1];
        const nextText = typeof latest.text === "string" ? latest.text : previous.text;
        openDocuments.set(uri, {
          text: nextText,
          version: Number(params?.textDocument?.version || previous.version + 1),
        });
        writeDocumentToDisk({ uri, text: nextText });
        await refreshWorkspace();
        return;
      }

      if (method === "textDocument/didClose") {
        const uri = params?.textDocument?.uri;
        if (!uri) {
          return;
        }
        openDocuments.delete(uri);
        await refreshWorkspace();
      }
    },
  });

  return new Promise(() => {});
};
