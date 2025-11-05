import { bulkhead } from "cockatiel";
import * as vscode from "vscode";
import { HexDecorator } from "./decorators";
import {
	DiffDecoratorResponseMessage,
	DiffExtensionHostMessageHandler,
	DiffMessageType,
} from "./diffWorkerProtocol";
import { Uf2DocumentModel } from "./uf2DocumentModel";
export type Uf2DiffModelBuilder = typeof Uf2DiffModel.Builder.prototype;

export class Uf2DiffModel {
	/** Guard to make sure only one computation operation happens */
	private readonly saveGuard = bulkhead(1, Infinity);
	private decorators?: { original: HexDecorator[]; modified: HexDecorator[] };

	constructor(
		private readonly originalModel: Uf2DocumentModel,
		private readonly modifiedModel: Uf2DocumentModel,
		private readonly messageHandler: DiffExtensionHostMessageHandler,
	) {}

	public async computeDecorators(uri: vscode.Uri): Promise<HexDecorator[]> {
		return this.saveGuard.execute(async () => {
			if (this.decorators === undefined) {
				//TODO: Add a warning if the file sizes are too large?
				const oSize = await this.originalModel.sizeWithEdits();
				const mSize = await this.modifiedModel.sizeWithEdits();
				if (oSize === undefined || mSize === undefined) {
					throw new Error("UF2 Editor Diff: Failed to get file sizes.");
				}
				const oArray = new Uint8Array(oSize);
				const mArray = new Uint8Array(mSize);
				await this.originalModel.readInto(0, oArray);
				await this.modifiedModel.readInto(0, mArray);
				const decorators = await this.messageHandler.sendRequest<DiffDecoratorResponseMessage>(
					{
						type: DiffMessageType.DiffDecoratorRequest,
						original: oArray,
						modified: mArray,
					},
					[oArray.buffer, mArray.buffer],
				);
				this.decorators = decorators;
			}
			return uri.toString() === this.originalModel.uri.toString()
				? this.decorators.original
				: this.decorators.modified;
		});
	}

	/**
	 * Class to coordinate the creation of Uf2DiffModel
	 * with both HexDocumentModels
	 */
	static Builder = class {
		private original: {
			promise: Promise<Uf2DocumentModel>;
			resolve: (model: Uf2DocumentModel) => void;
		};
		private modified: {
			promise: Promise<Uf2DocumentModel>;
			resolve: (model: Uf2DocumentModel) => void;
		};

		private built?: Uf2DiffModel;

		constructor(private readonly messageHandler: DiffExtensionHostMessageHandler) {
			let promise: Promise<Uf2DocumentModel>;
			let res: (model: Uf2DocumentModel) => void;

			promise = new Promise<Uf2DocumentModel>(resolve => (res = resolve));
			this.original = { promise: promise, resolve: res! };
			promise = new Promise<Uf2DocumentModel>(resolve => (res = resolve));
			this.modified = { promise: promise, resolve: res! };
		}

		public setModel(side: "original" | "modified", document: Uf2DocumentModel) {
			if (side === "original") {
				this.original.resolve(document);
			} else {
				this.modified.resolve(document);
			}
			return this;
		}

		public async build() {
			const [original, modified] = await Promise.all([
				this.original.promise,
				this.modified.promise,
			]);
			if (this.built === undefined) {
				this.built = new Uf2DiffModel(original, modified, this.messageHandler);
			}
			return this.built;
		}
	};
}
