import { expect } from "chai";
import {
	MessageType,
	ReadRangeMessage,
	ReadyRequestMessage,
	SearchRequestMessage,
} from "../../shared/protocol";
import { BrowserFileAccessor } from "../BrowserFileAccessor";
import { MockMessageHandler } from "../MockMessageHandler";
import { createTestFile } from "./utils/file";

describe("MockMessageHandler", () => {
	const createHandler = (size = 32): MockMessageHandler => {
		const bytes = Array.from({ length: size }, (_, index) => index & 0xff);
		return new MockMessageHandler(new BrowserFileAccessor(createTestFile(bytes)));
	};

	it("responds to ReadyRequest with file metadata", async () => {
		const handler = createHandler(8);
		const response = await handler.handleMessage({
			type: MessageType.ReadyRequest,
		} satisfies ReadyRequestMessage);

		if (!response || response.type !== MessageType.ReadyResponse) {
			expect.fail("Expected ReadyResponse message");
		}

		expect(response.fileSize).to.equal(8);
		expect(response.isReadonly).to.be.true;
		expect(response.decorators).to.deep.equal([]);
	});

	it("marks files larger than 10MB as large", async () => {
		const largeArray = new Uint8Array(10 * 1024 * 1024 + 1);
		largeArray.fill(0xaa);
		const handler = new MockMessageHandler(new BrowserFileAccessor(createTestFile(largeArray)));

		const response = await handler.handleMessage({
			type: MessageType.ReadyRequest,
		} satisfies ReadyRequestMessage);
		if (!response || response.type !== MessageType.ReadyResponse) {
			expect.fail("Expected ReadyResponse message");
		}
		expect(response.isLargeFile).to.be.true;
	});

	it("returns undefined for unsupported message types", async () => {
		const handler = createHandler();
		const result = await handler.handleMessage({
			cap: undefined,
			caseSensitive: true,
			query: { literal: [] },
			type: MessageType.SearchRequest,
		} satisfies SearchRequestMessage);

		expect(result).to.be.undefined;
	});

	it("returns the requested byte ranges", async () => {
		const handler = createHandler(16);
		const response = await handler.handleMessage({
			bytes: 4,
			offset: 4,
			type: MessageType.ReadRangeRequest,
		} satisfies ReadRangeMessage);

		if (!response || response.type !== MessageType.ReadRangeResponse) {
			expect.fail("Expected ReadRangeResponse message");
		}

		const payload = new Uint8Array(response.data);
		expect(Array.from(payload)).to.deep.equal([4, 5, 6, 7]);
	});

	it("trims the returned ArrayBuffer when the request exceeds EOF", async () => {
		const handler = createHandler(4);
		const response = await handler.handleMessage({
			bytes: 8,
			offset: 2,
			type: MessageType.ReadRangeRequest,
		} satisfies ReadRangeMessage);

		if (!response || response.type !== MessageType.ReadRangeResponse) {
			expect.fail("Expected ReadRangeResponse message");
		}

		const payload = new Uint8Array(response.data);
		expect(Array.from(payload)).to.deep.equal([2, 3]);
	});

	it("returns an empty buffer for zero-length requests", async () => {
		const handler = createHandler();
		const response = await handler.handleMessage({
			bytes: 0,
			offset: 0,
			type: MessageType.ReadRangeRequest,
		} satisfies ReadRangeMessage);

		if (!response || response.type !== MessageType.ReadRangeResponse) {
			expect.fail("Expected ReadRangeResponse message");
		}
		expect(response.data.byteLength).to.equal(0);
	});
});
