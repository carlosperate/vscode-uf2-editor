// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Uf2DocumentEditOp } from "../shared/uf2DocumentModel";
import { openCompareSelected } from "./compareSelected";
import { copyAs } from "./copyAs";
import { showGoToOffset } from "./goToOffset";
import { prepareLazyInitDiffWorker } from "./initWorker";
import { showSelectBetweenOffsets } from "./selectBetweenOffsets";
import StatusEditMode from "./statusEditMode";
import StatusFocus from "./statusFocus";
import StatusHoverAndSelection from "./statusHoverAndSelection";
import { Uf2DiffFSProvider } from "./uf2DiffFS";
import { Uf2EditorProvider } from "./uf2EditorProvider";
import { Uf2EditorRegistry } from "./uf2EditorRegistry";

function reopenWithUf2Editor() {
	const activeTabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input as {
		[key: string]: any;
		uri: vscode.Uri | undefined;
	};
	if (activeTabInput.uri) {
		vscode.commands.executeCommand("vscode.openWith", activeTabInput.uri, "uf2Editor.uf2edit");
	}
}

export async function activate(context: vscode.ExtensionContext) {
	// Prepares the worker to be lazily initialized
	const initWorker = prepareLazyInitDiffWorker(context.extensionUri, workerDispose =>
		context.subscriptions.push(workerDispose),
	);
	const registry = new Uf2EditorRegistry(initWorker);
	context.subscriptions.push(registry);

	const openWithCommand = vscode.commands.registerCommand(
		"uf2Editor.openFile",
		reopenWithUf2Editor,
	);
	const goToOffsetCommand = vscode.commands.registerCommand("uf2Editor.goToOffset", () => {
		const first = registry.activeMessaging[Symbol.iterator]().next();
		if (first.value) {
			showGoToOffset(first.value);
		}
	});
	const selectBetweenOffsetsCommand = vscode.commands.registerCommand(
		"uf2Editor.selectBetweenOffsets",
		() => {
			const first = registry.activeMessaging[Symbol.iterator]().next();
			if (first.value) {
				showSelectBetweenOffsets(first.value, registry);
			}
		},
	);

	const copyAsCommand = vscode.commands.registerCommand("uf2Editor.copyAs", () => {
		const first = registry.activeMessaging[Symbol.iterator]().next();
		if (first.value) {
			copyAs(first.value);
		}
	});

	const switchEditModeCommand = vscode.commands.registerCommand("uf2Editor.switchEditMode", () => {
		if (registry.activeDocument) {
			registry.activeDocument.editMode =
				registry.activeDocument.editMode === Uf2DocumentEditOp.Insert
					? Uf2DocumentEditOp.Replace
					: Uf2DocumentEditOp.Insert;
		}
	});

	const copyOffsetAsHex = vscode.commands.registerCommand("uf2Editor.copyOffsetAsHex", () => {
		if (registry.activeDocument) {
			const focused = registry.activeDocument.selectionState.focused;
			if (focused !== undefined) {
				vscode.env.clipboard.writeText(focused.toString(16).toUpperCase());
			}
		}
	});

	const copyOffsetAsDec = vscode.commands.registerCommand("uf2Editor.copyOffsetAsDec", () => {
		if (registry.activeDocument) {
			const focused = registry.activeDocument.selectionState.focused;
			if (focused !== undefined) {
				vscode.env.clipboard.writeText(focused.toString());
			}
		}
	});

	const compareSelectedCommand = vscode.commands.registerCommand(
		"uf2Editor.compareSelected",
		async (...args) => {
			if (args.length !== 2 && !(args[1] instanceof Array)) {
				return;
			}
			const [leftFile, rightFile] = args[1];
			if (!(leftFile instanceof vscode.Uri && rightFile instanceof vscode.Uri)) {
				return;
			}
			openCompareSelected(leftFile, rightFile);
		},
	);

	context.subscriptions.push(new StatusEditMode(registry));
	context.subscriptions.push(new StatusFocus(registry));
	context.subscriptions.push(new StatusHoverAndSelection(registry));
	context.subscriptions.push(goToOffsetCommand);
	context.subscriptions.push(selectBetweenOffsetsCommand);
	context.subscriptions.push(copyAsCommand);
	context.subscriptions.push(switchEditModeCommand);
	context.subscriptions.push(openWithCommand);
	context.subscriptions.push(copyOffsetAsDec, copyOffsetAsHex);
	context.subscriptions.push(compareSelectedCommand);
	context.subscriptions.push(
		vscode.workspace.registerFileSystemProvider("uf2diff", new Uf2DiffFSProvider(), {
			isCaseSensitive:
				typeof process !== "undefined" &&
				process.platform !== "win32" &&
				process.platform !== "darwin",
		}),
	);
	context.subscriptions.push(Uf2EditorProvider.register(context, registry));
}

export function deactivate(): void {
	/* no-op */
}
