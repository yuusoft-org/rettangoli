# LSP Setup And Protocol Matrix

`rtgl-check lsp` runs a stdio language server on the same semantic core used by `check` and `compile`.

## Setup

```bash
cd packages/rettangoli-check
node ./src/cli/bin.js lsp --stdio --dir ./src/components
```

Editor clients should connect using LSP over stdio.

## Supported Methods

- `initialize`
- `initialized`
- `shutdown`
- `exit`
- `textDocument/didOpen`
- `textDocument/didChange`
- `textDocument/didClose`
- `textDocument/hover`
- `textDocument/definition`
- `textDocument/references`
- `textDocument/rename`
- `textDocument/codeAction`
- `workspace/executeCommand` (`rtgl.applySafeAutofix`)
- Server push: `textDocument/publishDiagnostics`

## Conformance

Contract tests:

- `scripts/test-lsp-contract.mjs`
