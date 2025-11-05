// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { DiffExtensionHostMessageHandler } from "../shared/diffWorkerProtocol";
import { ExtensionHostMessageHandler } from "../shared/protocol";
import { Uf2DiffModel, Uf2DiffModelBuilder } from "../shared/uf2DiffModel";
import { parseQuery } from "../shared/util/uri";
import { Disposable } from "./dispose";
import { Uf2Document } from "./uf2Document";

const EMPTY: never[] = [];

export class Uf2EditorRegistry extends Disposable {
	private readonly docs = new Map<Uf2Document, Set<ExtensionHostMessageHandler>>();
	private readonly diffsBuilder = new Map<
		string,
		{ refCount: number; value: Uf2DiffModelBuilder }
	>();
	private onChangeEmitter = new vscode.EventEmitter<Uf2Document | undefined>();
	private _activeDocument?: Uf2Document;

	/**
	 * Event emitter that fires when the focused hex editor changes.
	 */
	public readonly onDidChangeActiveDocument = this.onChangeEmitter.event;

	/**
	 * The currently active hex editor.
	 */
	public get activeDocument() {
		return this._activeDocument;
	}

	/**
	 * Messaging for the active hex editor.
	 */
	public get activeMessaging(): Iterable<ExtensionHostMessageHandler> {
		return (this._activeDocument && this.docs.get(this._activeDocument)) || EMPTY;
	}

	constructor(private readonly initDiffWorker: () => DiffExtensionHostMessageHandler) {
		super();
		this._register(vscode.window.tabGroups.onDidChangeTabs(this.onChangedTabs, this));
		this._register(vscode.window.tabGroups.onDidChangeTabGroups(this.onChangedTabs, this));
		this.onChangedTabs();
	}

	/** Gets messaging info for a document */
	public getMessaging(document: Uf2Document): Iterable<ExtensionHostMessageHandler> {
		return this.docs.get(document) || EMPTY;
	}

	/** Registers an opened hex document. */
	public add(document: Uf2Document, messaging: ExtensionHostMessageHandler) {
		let collection = this.docs.get(document);
		if (collection) {
			collection.add(messaging);
		} else {
			collection = new Set([messaging]);
			this.docs.set(document, collection);
		}

		// re-evaluate, since if a hex editor was just opened it won't have created
		// a Uf2Document by the time the tab change event is delivered.
		this.onChangedTabs();

		return {
			dispose: () => {
				collection!.delete(messaging);
				if (collection!.size === 0) {
					this.docs.delete(document);
				}
			},
		};
	}

	/** returns a diff model using the file uri */
	public getDiff(uri: vscode.Uri): {
		builder: Uf2DiffModelBuilder | undefined;
		dispose: () => void;
	} {
		const { token } = parseQuery(uri.query);
		if (token === undefined) {
			return { builder: undefined, dispose: () => {} };
		}
		// Lazily initializes the diff worker, if it isn't
		// iniitalized already
		const messageHandler = this.initDiffWorker();

		// Creates a new diff model
		if (!this.diffsBuilder.has(token)) {
			this.diffsBuilder.set(token, {
				refCount: 0,
				value: new Uf2DiffModel.Builder(messageHandler),
			});
		}
		const builder = this.diffsBuilder.get(token)!;
		builder.refCount++;

		return {
			builder: builder.value,
			dispose: () => {
				builder.refCount--;
				if (builder.refCount === 0) {
					this.diffsBuilder.delete(token);
				}
			},
		};
	}

	private onChangedTabs() {
		const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
		const uri = input instanceof vscode.TabInputCustom ? input.uri : undefined;
		let next: Uf2Document | undefined = undefined;
		if (uri) {
			for (const doc of this.docs.keys()) {
				if (doc.uri.toString() === uri.toString()) {
					next = doc;
					break;
				}
			}
		}

		if (next === this._activeDocument) {
			return;
		}

		this._activeDocument = next;
		vscode.commands.executeCommand("setContext", "uf2Editor:isActive", !!next);
		this.onChangeEmitter.fire(next);
	}
}
