import { expect } from "chai";
import { MessageType, ReadRangeMessage, ReadyRequestMessage } from "../../shared/protocol";
import { BrowserFileAccessor } from "../BrowserFileAccessor";
import { MockMessageHandler } from "../MockMessageHandler";
import { loadFixture } from "./utils/file";

// Known sizes from tests/uf2_files/ (committed fixtures, must not change without updating here)
const SMALL_FILE = "flag_file_container.uf2"; // 2 UF2 blocks
const MEDIUM_FILE = "no_family.uf2"; // 256 UF2 blocks
const LARGE_FILE = "large.uf2"; // >10 MB threshold

const SMALL_SIZE = 1_024;
const MEDIUM_SIZE = 128 * 1_024;
const LARGE_SIZE = 12 * 1_024 * 1_024;

const createHandler = (filename: string): MockMessageHandler =>
	new MockMessageHandler(new BrowserFileAccessor(loadFixture(filename)));

describe("Integration: BrowserFileAccessor with real UF2 fixtures", () => {
	it("reads the correct number of bytes from the small fixture", async () => {
		const accessor = new BrowserFileAccessor(loadFixture(SMALL_FILE));
		expect(accessor.size()).to.equal(SMALL_SIZE);
		expect(accessor.name()).to.equal(SMALL_FILE);
	});

	it("reads the first 512 bytes of the medium fixture without error", async () => {
		const accessor = new BrowserFileAccessor(loadFixture(MEDIUM_FILE));
		expect(accessor.size()).to.equal(MEDIUM_SIZE);

		const buf = new Uint8Array(512);
		const read = await accessor.readInto(0, buf);
		expect(read).to.equal(512);
	});

	it("reads a range that spans the midpoint of the medium fixture", async () => {
		const accessor = new BrowserFileAccessor(loadFixture(MEDIUM_FILE));
		const mid = Math.floor(MEDIUM_SIZE / 2);
		const buf = new Uint8Array(256);

		const read = await accessor.readInto(mid, buf);
		expect(read).to.equal(256);
	});

	it("returns fewer bytes than requested at EOF of the medium fixture", async () => {
		const accessor = new BrowserFileAccessor(loadFixture(MEDIUM_FILE));
		const buf = new Uint8Array(512);

		const read = await accessor.readInto(MEDIUM_SIZE - 100, buf);
		expect(read).to.equal(100);
	});
});

describe("Integration: MockMessageHandler with real UF2 fixtures", () => {
	it("reports the correct file size for the small fixture", async () => {
		const handler = createHandler(SMALL_FILE);
		const response = await handler.handleMessage({
			type: MessageType.ReadyRequest,
		} satisfies ReadyRequestMessage);

		if (!response || response.type !== MessageType.ReadyResponse) {
			expect.fail("Expected ReadyResponse");
		}
		expect(response.fileSize).to.equal(SMALL_SIZE);
		expect(response.isReadonly).to.be.true;
		expect(response.isLargeFile).to.be.false;
	});

	it("reports the correct file size for the medium fixture", async () => {
		const handler = createHandler(MEDIUM_FILE);
		const response = await handler.handleMessage({
			type: MessageType.ReadyRequest,
		} satisfies ReadyRequestMessage);

		if (!response || response.type !== MessageType.ReadyResponse) {
			expect.fail("Expected ReadyResponse");
		}
		expect(response.fileSize).to.equal(MEDIUM_SIZE);
		expect(response.isReadonly).to.be.true;
		expect(response.isLargeFile).to.be.false;
	});

	it("flags the large fixture as a large file", async () => {
		const handler = createHandler(LARGE_FILE);
		const response = await handler.handleMessage({
			type: MessageType.ReadyRequest,
		} satisfies ReadyRequestMessage);

		if (!response || response.type !== MessageType.ReadyResponse) {
			expect.fail("Expected ReadyResponse");
		}
		expect(response.fileSize).to.equal(LARGE_SIZE);
		expect(response.isLargeFile).to.be.true;
	});

	it("serves the first page of the medium fixture via ReadRangeRequest", async () => {
		const handler = createHandler(MEDIUM_FILE);
		const response = await handler.handleMessage({
			bytes: 16_384,
			offset: 0,
			type: MessageType.ReadRangeRequest,
		} satisfies ReadRangeMessage);

		if (!response || response.type !== MessageType.ReadRangeResponse) {
			expect.fail("Expected ReadRangeResponse");
		}
		expect(response.data.byteLength).to.equal(16_384);
	});

	it("serves a range straddling a page boundary in the medium fixture", async () => {
		const handler = createHandler(MEDIUM_FILE);
		const pageSize = 16_384;
		const response = await handler.handleMessage({
			bytes: 256,
			offset: pageSize - 128,
			type: MessageType.ReadRangeRequest,
		} satisfies ReadRangeMessage);

		if (!response || response.type !== MessageType.ReadRangeResponse) {
			expect.fail("Expected ReadRangeResponse");
		}
		expect(response.data.byteLength).to.equal(256);
	});

	it("serves a truncated range at EOF of the medium fixture", async () => {
		const handler = createHandler(MEDIUM_FILE);
		const response = await handler.handleMessage({
			bytes: 512,
			offset: MEDIUM_SIZE - 64,
			type: MessageType.ReadRangeRequest,
		} satisfies ReadRangeMessage);

		if (!response || response.type !== MessageType.ReadRangeResponse) {
			expect.fail("Expected ReadRangeResponse");
		}
		expect(response.data.byteLength).to.equal(64);
	});
});
