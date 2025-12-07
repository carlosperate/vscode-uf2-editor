# Standalone UF2/Hex File Viewer

A browser-based hex/UF2 viewer that reuses the VS Code webview components without requiring the editor.

## Features (planned)

- Drag-and-drop or file picker loading
- Hex + ASCII rendering with virtual scrolling
- Data inspector for common numeric formats
- Read-only experience that mirrors the VS Code extension

## Current Status

The standalone shell is under active development.

In the meantime you can:

- Run the standalone unit tests via `npm test`.
- Type-check the new browser code via `npx tsc -p standalone/tsconfig.json --noEmit`.
- Follow progress for future commands in the analysis doc.

## Deployment

Deployment instructions will be added once the build pipeline is in place and `dist-standalone/` artifacts are generated.

## Code Sharing

This package shares most logic with the extension:

- `media/editor/` – React UI and Recoil state used by both
- `shared/` – Protocol definitions, document model, utilities
- `standalone/` – Browser-specific file access, scaffolding, and entry points
