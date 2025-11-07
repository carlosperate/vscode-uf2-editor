// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import {
	CopyFormat,
	Endianness,
	ExtensionHostMessageHandler,
	FromWebviewMessage,
	ICodeSettings,
	IEditorSettings,
	MessageHandler,
	MessageType,
	PasteMode,
	ToWebviewMessage,
} from "../shared/protocol";
import { deserializeEdits, serializeEdits } from "../shared/serialization";
import { ILocalizedStrings, placeholder1 } from "../shared/strings";
import {
	Uf2DocumentEdit,
	Uf2DocumentEditOp,
	Uf2DocumentEditReference,
} from "../shared/uf2DocumentModel";
import { copyAsFormats } from "./copyAs";
import { disposeAll } from "./dispose";
import { ISearchRequest, LiteralSearchRequest, RegexSearchRequest } from "./searchRequest";
import { Uf2Document } from "./uf2Document";
import { Uf2EditorRegistry } from "./uf2EditorRegistry";
import { flattenBuffers, getBaseName, getCorrectArrayBuffer, randomString } from "./util";

const defaultEditorSettings: Readonly<IEditorSettings> = {
	columnWidth: 16,
	copyType: CopyFormat.HexOctets,
	showDecodedText: true,
	defaultEndianness: Endianness.Little,
};

const editorSettingsKeys = Object.keys(defaultEditorSettings) as readonly (keyof IEditorSettings)[];

export class Uf2EditorProvider implements vscode.CustomEditorProvider<Uf2Document> {
	public static register(
		context: vscode.ExtensionContext,
		registry: Uf2EditorRegistry,
	): vscode.Disposable {
		return vscode.window.registerCustomEditorProvider(
			Uf2EditorProvider.viewType,
			new Uf2EditorProvider(context, registry),
			{
				supportsMultipleEditorsPerDocument: false,
			},
		);
	}

	private static readonly viewType = "uf2Editor.uf2edit";

	constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _registry: Uf2EditorRegistry,
	) {}

	async openCustomDocument(
		uri: vscode.Uri,
		openContext: vscode.CustomDocumentOpenContext,
		_token: vscode.CancellationToken,
	): Promise<Uf2Document> {
		const diff = this._registry.getDiff(uri);

		const { document, accessor } = await Uf2Document.create(uri, openContext, diff.builder);
		const disposables: vscode.Disposable[] = [];
		disposables.push(diff);
		disposables.push(
			document.onDidRevert(async () => {
				const replaceFileSize = (await document.size()) ?? null;
				for (const messaging of this._registry.getMessaging(document)) {
					messaging.sendEvent({
						type: MessageType.SetEdits,
						edits: { edits: [], data: new Uint8Array() },
						replaceFileSize,
					});
					messaging.sendEvent({ type: MessageType.ReloadFromDisk });
				}
			}),

			document.onDidChangeEditMode(mode => {
				for (const messaging of this._registry.getMessaging(document)) {
					messaging.sendEvent({
						type: MessageType.SetEditMode,
						mode: mode,
					});
				}
			}),
		);

		const overwrite = "Overwrite";
		const onDidChange = async () => {
			if (document.isSynced) {
				// If we executed a save recently the change was probably caused by us
				// we shouldn't trigger a revert to resync the document as it is already sync
				const recentlySaved = Date.now() - document.lastSave < 5_000;
				if (!recentlySaved) {
					document.revert();
				}
				return;
			}

			const message =
				"This file has changed on disk, but you have unsaved changes. Saving now will overwrite the file on disk with your changes.";
			const revert = "Revert";
			const selected = await vscode.window.showWarningMessage(message, overwrite, revert);
			if (selected === overwrite) {
				vscode.commands.executeCommand("workbench.action.files.save");
			} else if (selected === revert) {
				vscode.commands.executeCommand("workbench.action.files.revert");
			}
		};

		const onDidDelete = () => {
			for (const group of vscode.window.tabGroups.all) {
				for (const editor of group.tabs) {
					if (editor.input === document) {
						vscode.window.tabGroups.close(editor, true);
					}
				}
			}
		};

		disposables.push(accessor.watch(onDidChange, onDidDelete));

		document.onDidDispose(() => disposeAll(disposables));

		return document;
	}

	async resolveCustomEditor(
		document: Uf2Document,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken,
	): Promise<void> {
		const messageHandler: ExtensionHostMessageHandler = new MessageHandler(
			message => this.onMessage(messageHandler, document, message),
			message => webviewPanel.webview.postMessage(message),
		);

		// Add the webview to our internal set of active webviews
		const handle = this._registry.add(document, messageHandler);
		webviewPanel.onDidDispose(() => handle.dispose());

		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
		webviewPanel.webview.onDidReceiveMessage(e => messageHandler.handleMessage(e));
	}

	private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
		vscode.CustomDocumentEditEvent<Uf2Document>
	>();
	public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

	public async saveCustomDocument(
		document: Uf2Document,
		cancellation: vscode.CancellationToken,
	): Promise<void> {
		await document.save(cancellation);

		// Update all webviews that a save has just occured
		for (const messaging of this._registry.getMessaging(document)) {
			messaging.sendEvent({ type: MessageType.Saved, unsavedEditIndex: document.unsavedEditIndex });
		}
	}

	public saveCustomDocumentAs(
		document: Uf2Document,
		destination: vscode.Uri,
		cancellation: vscode.CancellationToken,
	): Thenable<void> {
		return document.saveAs(destination, cancellation);
	}

	public revertCustomDocument(
		document: Uf2Document,
		cancellation: vscode.CancellationToken,
	): Thenable<void> {
		return document.revert(cancellation);
	}

	public backupCustomDocument(
		document: Uf2Document,
		context: vscode.CustomDocumentBackupContext,
		_cancellation: vscode.CancellationToken,
	): Thenable<vscode.CustomDocumentBackup> {
		return document.backup(context.destination);
	}

	/**
	 * Get the static HTML used for in our editor's webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Convert the styles and scripts for the webview into webview URIs
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, "dist", "editor.js"),
		);
		const styleUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._context.extensionUri, "dist", "editor.css"),
		);

		// Use a nonce to allow certain scripts to be run
		const nonce = randomString();
		const strings: ILocalizedStrings = {
			pasteAs: "Paste as",
			pasteMode: "Paste mode",
			replace: "Replace",
			insert: "Insert",
			bytes: "bytes",
			encodingError: "Encoding Error",
			decodedText: "Decoded Text",
			loadingUpper: "LOADING",
			loadingDotDotDot: "Loading...",
			littleEndian: "Little Endian",
			onlyHexChars: "Only hexadecimal characters (0-9 and a-f) are allowed",
			onlyHexCharsAndPlaceholders:
				"Only hexadecimal characters (0-9, a-f, and ?? placeholders) are allowed",
			toggleReplace: "Toggle Replace",
			findBytes: "Find Bytes (hex)",
			findText: "Find Text",
			regexSearch: "Regular Expression Search",
			searchInBinaryMode: "Search in Binary Mode",
			caseSensitive: "Case Sensitive",
			cancelSearch: "Cancel Search",
			previousMatch: "Previous Match",
			nextMatch: "Next Match",
			closeWidget: "Close Widget (Esc)",
			replaceAllMatches: "Replace All Matches",
			replaceSelectedMatch: "Replace Selected Match",
			resultOverflow: `More than ${placeholder1} results, click to find all`,
			resultCount: `${placeholder1} results`,
			foundNResults: `Found ${placeholder1}...`,
			noResults: "No results",
			openLargeFileWarning: "Opening this large file may cause instability.",
			openAnyways: "Open Anyways",
			readonlyWarning: "Cannot edit in read-only editor.",
			openSettings: "Open Settings",
			showDecodedText: "Show Decoded Text",
			bytesPerRow: "Bytes per row",
			close: "Close",
		};

		return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; font-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleUri}" rel="stylesheet" />
				<script nonce="${nonce}">globalThis.LOC_STRINGS=${JSON.stringify(strings)}</script>
				<script nonce="${nonce}" src="${scriptUri}" defer></script>

				<title>UF2 Editor</title>
			</head>
			<body>
			</body>
			</html>`;
	}

	private readCodeSettings(): ICodeSettings {
		const editorConfig = vscode.workspace.getConfiguration("editor");
		return {
			scrollBeyondLastLine: editorConfig.get("scrollBeyondLastLine", true),
		};
	}

	private readEditorSettings(): IEditorSettings {
		const config = vscode.workspace.getConfiguration("uf2editor");
		const settings: IEditorSettings = { ...defaultEditorSettings };
		for (const key of editorSettingsKeys) {
			if (config.has(key)) {
				(settings as any)[key] = config.get(key);
			}
		}
		return settings;
	}

	private writeEditorSettings(settings: IEditorSettings) {
		const config = vscode.workspace.getConfiguration("uf2editor");
		for (const key of editorSettingsKeys) {
			const existing = config.inspect(key);
			const target = !existing
				? vscode.ConfigurationTarget.Global
				: existing.workspaceFolderValue !== undefined
					? vscode.ConfigurationTarget.WorkspaceFolder
					: existing.workspaceValue !== undefined
						? vscode.ConfigurationTarget.Workspace
						: vscode.ConfigurationTarget.Global;
			config.update(key, settings[key], target);
		}
	}

	private async onMessage(
		messaging: ExtensionHostMessageHandler,
		document: Uf2Document,
		message: FromWebviewMessage,
	): Promise<undefined | ToWebviewMessage> {
		switch (message.type) {
			// If it's a packet request
			case MessageType.ReadyRequest:
				return {
					type: MessageType.ReadyResponse,
					initialOffset: document.baseAddress,
					editorSettings: this.readEditorSettings(),
					codeSettings: this.readCodeSettings(),
					edits: serializeEdits(document.edits),
					unsavedEditIndex: document.unsavedEditIndex,
					fileSize: await document.size(),
					pageSize: document.pageSize,
					isLargeFile: document.isLargeFile,
					isReadonly: document.isReadonly,
					editMode: document.editMode,
					decorators: await document.readDecorators(),
				};
			case MessageType.SetSelectedCount:
				document.selectionState = message;
				break;
			case MessageType.SetHoveredByte:
				document.hoverState = message.hovered;
				break;
			case MessageType.ReadRangeRequest:
				const data = await document.readBuffer(message.offset, message.bytes);
				return { type: MessageType.ReadRangeResponse, data: getCorrectArrayBuffer(data) };
			case MessageType.MakeEdits:
				this.publishEdit(messaging, document, document.makeEdits(deserializeEdits(message.edits)));
				return;
			case MessageType.DoPaste:
				this.publishEdit(
					messaging,
					document,
					message.mode === PasteMode.Insert
						? document.insert(message.offset, message.data)
						: await document.replace(message.offset, message.data),
				);
				messaging.sendEvent({ type: MessageType.SetEdits, edits: serializeEdits(document.edits) });
				return;
			case MessageType.DoCopy: {
				const parts = await Promise.all(
					message.selections
						.sort((a, b) => a[0] - b[0])
						.map(s => document.readBuffer(s[0], s[1] - s[0])),
				);
				const flatParts = flattenBuffers(parts);

				const filenameWoutExt = getBaseName(document.uri.path);

				copyAsFormats[message.format](flatParts, filenameWoutExt);

				return;
			}
			case MessageType.RequestDeletes: {
				const bytes = await Promise.all(
					message.deletes.map(d => document.readBufferWithEdits(d.start, d.end - d.start)),
				);
				const edits = bytes.map(
					(e, i): Uf2DocumentEdit => ({
						op: Uf2DocumentEditOp.Delete,
						previous: e,
						offset: message.deletes[i].start,
					}),
				);
				messaging.sendEvent({
					type: MessageType.SetEdits,
					edits: serializeEdits(edits),
					appendOnly: true,
				});
				this.publishEdit(messaging, document, document.makeEdits(edits));
				return { type: MessageType.DeleteAccepted };
			}
			case MessageType.CancelSearch:
				document.searchProvider.cancel();
				return;
			case MessageType.SearchRequest:
				let request: ISearchRequest;
				if ("re" in message.query) {
					request = new RegexSearchRequest(
						document,
						message.query,
						message.caseSensitive,
						message.cap,
					);
				} else {
					request = new LiteralSearchRequest(
						document,
						message.query,
						message.caseSensitive,
						message.cap,
					);
				}
				document.searchProvider.start(messaging, request);
				return;

			case MessageType.UpdateEditorSettings:
				this.writeEditorSettings(message.editorSettings);
				break;
		}
	}

	private publishEdit(
		messaging: ExtensionHostMessageHandler,
		document: Uf2Document,
		ref: Uf2DocumentEditReference,
	) {
		this._onDidChangeCustomDocument.fire({
			document,
			undo: () =>
				messaging.sendEvent({ type: MessageType.SetEdits, edits: serializeEdits(ref.undo()) }),
			redo: () =>
				messaging.sendEvent({ type: MessageType.SetEdits, edits: serializeEdits(ref.redo()) }),
		});
	}
}
