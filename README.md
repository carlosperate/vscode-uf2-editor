A custom editor extension for Visual Studio Code which provides a UF2 editor for viewing and manipulating files in their raw hexadecimal representation.

## Features

- Opening files as hex
- A data inspector for viewing the hex values as various different data types
- Editing with undo, redo, copy, and paste support
- Find and replace

![User opens a text file named release.txt and switches to the UF2 editor via command palette. The user then navigates and edits the document](https://raw.githubusercontent.com/carlosperate/vscode-uf2-editor/main/hex-editor.gif)

## How to Use

There are three ways to open a file in the UF2 editor:

1. Right click a file -> Open With -> UF2 Editor
2. Trigger the command palette (<kbd>F1</kbd>) -> Open File using UF2 Editor
3. Trigger the command palette (<kbd>F1</kbd>) -> Reopen With -> UF2 Editor

The UF2 editor can be set as the default editor for certain file types by using the `workbench.editorAssociations` setting. For example, this would associate all files with extensions `.hex` and `.ini` to use the UF2 editor by default:

```json
"workbench.editorAssociations": {
    "*.hex": "uf2Editor.uf2edit",
    "*.ini": "uf2Editor.uf2edit"
},
```

## Configuring the Data Inspector

By default, the data inspector is shown just to the right of the data grid (or decoded text if enabled), but it can be configured (via the `uf2editor.inspectorType` setting) to instead show up while hovering over a data cell.

Another option is to give the data inspector a dedicated activity bar entry on the left (by setting `uf2editor.inspectorType` to `sidebar`) that appears when the UF2 editor is opened, causing the explorer or whatever sidebar you had opened to be hidden. If preferred, the UF2 editor view can be dragged into another view by dragging the ⬡ icon onto one of the other views. This can be used in combination with the `uf2editor.dataInspector.autoReveal` setting to avoid revealing the sidebar containing the data inspector altogether.

## Known Issues

To track existing issues or report a new one, please visit the GitHub Issues page at https://github.com/carlosperate/vscode-uf2-editor/issues
