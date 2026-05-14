import {
	CopyFormat,
	Endianness,
	FromWebviewMessage,
	ICodeSettings,
	IEditorSettings,
	MessageType,
	ReadRangeMessage,
	ReadyResponseMessage,
	ToWebviewMessage,
} from "../shared/protocol";
import { ISerializedEdits } from "../shared/serialization";
import { Uf2DocumentEditOp } from "../shared/uf2DocumentModel";
import { BrowserFileAccessor } from "./BrowserFileAccessor";

const PAGE_SIZE = 16 * 1024;
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024;

const EMPTY_EDITS: ISerializedEdits = {
	data: new Uint8Array(0),
	edits: [],
};

const DEFAULT_EDITOR_SETTINGS: IEditorSettings = {
	columnWidth: 16,
	copyType: CopyFormat.HexOctets,
	defaultEndianness: Endianness.Little,
	showDecodedText: true,
};

const DEFAULT_CODE_SETTINGS: ICodeSettings = {
	scrollBeyondLastLine: true,
};

export class MockMessageHandler {
	constructor(private readonly accessor: BrowserFileAccessor) {}

	public async handleMessage(message: FromWebviewMessage): Promise<ToWebviewMessage | undefined> {
		switch (message.type) {
			case MessageType.ReadyRequest:
				return this.createReadyResponse();
			case MessageType.ReadRangeRequest:
				return this.createReadRangeResponse(message);
			default:
				return undefined;
		}
	}

	private createReadyResponse(): ReadyResponseMessage {
		const fileSize = this.accessor.size();

		return {
			codeSettings: DEFAULT_CODE_SETTINGS,
			decorators: [],
			edits: EMPTY_EDITS,
			editorSettings: DEFAULT_EDITOR_SETTINGS,
			editMode: Uf2DocumentEditOp.Replace,
			fileSize,
			initialOffset: 0,
			isLargeFile: fileSize > LARGE_FILE_THRESHOLD,
			isReadonly: true,
			pageSize: PAGE_SIZE,
			type: MessageType.ReadyResponse,
			unsavedEditIndex: 0,
		};
	}

	private async createReadRangeResponse(message: ReadRangeMessage): Promise<ToWebviewMessage> {
		if (message.bytes <= 0) {
			return {
				data: new ArrayBuffer(0),
				type: MessageType.ReadRangeResponse,
			};
		}

		const target = new Uint8Array(message.bytes);
		const bytesRead = await this.accessor.readInto(message.offset, target);
		// `target` is a freshly-allocated buffer we own, so on a full read we can hand
		// it back without copying. A short read (EOF) still has to be sliced down.
		const data =
			bytesRead === target.byteLength ? target.buffer : target.buffer.slice(0, bytesRead);

		return {
			data,
			type: MessageType.ReadRangeResponse,
		};
	}
}
