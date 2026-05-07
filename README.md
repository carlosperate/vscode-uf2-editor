# VS Code UF2 Editor

Visual Studio Code extension that provides an editor for viewing and
manipulating [UF2](https://github.com/microsoft/uf2) files.

It also provides a standalone web viewer that can be used to view UF2 files online:
https://carlosperate.github.io/vscode-uf2-editor/

## Features

- Open UF2 files directly with this editor
- **UF2 Data Inspector**: decoded view of every UF2 block field (address, payload size, flags, family ID, extension tags, file container info) alongside the raw hex. The panel follows the hovered byte and falls back to the last clicked byte when nothing is hovered.
- A data inspector for viewing the hex values as various different data types
- Editing with undo, redo, copy, and paste support
- Find and replace

## How to Use

There are three ways to open a file in the UF2 editor:

1. Right click a file -> Open With -> UF2 Editor
2. Trigger the command palette (<kbd>F1</kbd>) -> Open File using UF2 Editor
3. Trigger the command palette (<kbd>F1</kbd>) -> Reopen With -> UF2 Editor

The UF2 editor can be set as the default editor for certain file types by using the `workbench.editorAssociations` setting. For example, this would associate all files with extensions `.bin` to use the UF2 editor by default:

```json
"workbench.editorAssociations": {
    "*.bin": "uf2Editor.uf2edit"
},
```

## Standalone Web Viewer

A browser-based version of the viewer is available on the `standalone` folder. It reuses the same editor UI without requiring VS Code.

```bash
npm run build:standalone   # production build → dist-standalone/
npm run watch:standalone   # rebuild on file changes
npx serve dist-standalone  # serve locally
```

The `dist-standalone/` output can be deployed to any static host (GitHub Pages, Netlify, etc.).

## Development

1. Install dependencies: `npm install`
2. Start the watch build: `npm run watch`
3. Press <kbd>F5</kbd> in VS Code to launch the **Run Extension** debug configuration — this opens a new Extension Development Host window with the extension loaded.

To run the tests: `npm test`

## Known Issues

To track existing issues or report a new one, please visit the GitHub Issues page at https://github.com/carlosperate/vscode-uf2-editor/issues

## License & Acknowledgments

This extension is a fork of the
[Microsoft VS Code Hex Editor](https://github.com/microsoft/vscode-hexeditor).
We are grateful to Microsoft and all the contributors who built the original
hex editor extension that made this project possible.

MIT License - See [LICENSE](LICENSE) file for details.

Original extension work Copyright (c) Microsoft Corporation.
Updated UF2 support Copyright (c) 2025 Carlos Pereira Atencio.

Fork updates can be seen with
[this GitHub diff](https://github.com/carlosperate/vscode-uf2-editor/compare/7d97ac4003059cdefc8f533a6ad7381fe8ae0435...main).
