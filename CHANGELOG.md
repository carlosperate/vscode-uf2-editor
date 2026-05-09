# Release Notes

## v0.1.1 - 2026-??-??

## v0.1.0 - 2026-05-07

Initial release of the UF2 Editor, forked from [Microsoft VS Code Hex Editor](https://github.com/microsoft/vscode-hexeditor) v1.11.1.

Updated to register itself for `.uf2` files.

Decodes the UF2 block metadata and renders it in the Data Inspector panel, alongside the raw hex which is coloured by UF2 field.

The inspector shows the following fields when present:

- Block number, total blocks, target address, payload size, and flags
- Family ID (when the `familyID present` flag is set)
- File container filename and offset (when the `file container` flag is set)
- MD5 region checksum (when the `MD5 present` flag is set)
- Extension tag stream (firmware version, device description, and other tags when the `extension tags` flag is set)

The panel follows the hovered bytes and falls back to the last clicked byte when nothing is hovered.
Truncated or corrupted blocks show an inline notice rather than crashing.

Reusing the VSCode extension code, there is also a standalone web viewer.

### Major Changes from Upstream

- Data inspector had 3 configurable locations, only renders inside editor now.
- Removed Microsoft telemetry
