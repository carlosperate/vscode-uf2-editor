// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Uf2DocumentEditOp } from "../shared/uf2DocumentModel";
import { Disposable, DisposableValue } from "./dispose";
import { Uf2Document } from "./uf2Document";
import { Uf2EditorRegistry } from "./uf2EditorRegistry";

/**
 * this is a class to represent the status bar item that displays the edit mode
 *  - Replace or Insert
 *
 * @class StatusEditMode
 */
export default class StatusEditMode extends Disposable {
	private readonly item: vscode.StatusBarItem;
	private readonly docChangeListener = this._register(new DisposableValue());

	constructor(registry: Uf2EditorRegistry) {
		super();

		this.item = this._register(
			vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99),
		);
		this.item.tooltip = vscode.l10n.t("Switch Edit Mode");
		this.item.command = "uf2Editor.switchEditMode";

		const trackDocument = (doc: Uf2Document | undefined) => {
			if (doc) {
				this.docChangeListener.value = doc.onDidChangeEditMode(e => this.update(e));
				this.update(doc.editMode);
				this.show();
			} else {
				this.hide();
			}
		};

		this._register(registry.onDidChangeActiveDocument(trackDocument));
		trackDocument(registry.activeDocument);
	}

	update(mode: Uf2DocumentEditOp.Insert | Uf2DocumentEditOp.Replace): void {
		if (mode === Uf2DocumentEditOp.Insert) {
			this.item.text = vscode.l10n.t("Insert");
		} else if (mode === Uf2DocumentEditOp.Replace) {
			this.item.text = vscode.l10n.t("Replace");
		} else {
			this.item.hide();
			return;
		}
		this.item.show();
	}

	show() {
		this.item.show();
	}

	hide() {
		this.item.hide();
	}
}
