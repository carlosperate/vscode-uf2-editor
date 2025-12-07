import { Blob as NodeBlob } from "buffer";
import { expect } from "chai";
import { BrowserFileAccessor } from "./BrowserFileAccessor";

type FileConstructor = typeof File;

const BlobBase: typeof Blob =
	typeof globalThis.Blob === "function"
		? (globalThis.Blob as typeof Blob)
		: (NodeBlob as unknown as typeof Blob);

class PolyfillFile extends BlobBase {
	readonly name: string;
	readonly lastModified: number;

	constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
		super(parts, options);
		this.name = name;
		this.lastModified = options?.lastModified ?? Date.now();
	}

	get [Symbol.toStringTag](): string {
		return "File";
	}
}

const FileCtor: FileConstructor =
	typeof globalThis.File === "function"
		? (globalThis.File as FileConstructor)
		: (PolyfillFile as unknown as FileConstructor);

function createFile(contents: readonly number[], name = "sample.uf2"): File {
	const buffer = Uint8Array.from(contents);
	return new FileCtor([buffer], name, { type: "application/octet-stream" });
}

describe("BrowserFileAccessor", () => {
	it("exposes the underlying file metadata", () => {
		const accessor = new BrowserFileAccessor(createFile([0, 1, 2], "meta.uf2"));
		expect(accessor.name()).to.equal("meta.uf2");
		expect(accessor.size()).to.equal(3);
	});

	it("reads an entire buffer when enough bytes remain", async () => {
		const bytes = Array.from({ length: 8 }, (_, index) => index);
		const accessor = new BrowserFileAccessor(createFile(bytes));
		const target = new Uint8Array(bytes.length);

		const read = await accessor.readInto(0, target);

		expect(read).to.equal(bytes.length);
		expect(Array.from(target)).to.deep.equal(bytes);
	});

	it("only fills the portion of the buffer that overlaps the file", async () => {
		const bytes = Array.from({ length: 12 }, (_, index) => index + 1);
		const accessor = new BrowserFileAccessor(createFile(bytes));
		const target = new Uint8Array(8).fill(0xff);

		const read = await accessor.readInto(8, target);

		expect(read).to.equal(4);
		expect(Array.from(target.slice(0, 4))).to.deep.equal(bytes.slice(8));
		expect(Array.from(target.slice(4))).to.deep.equal(new Array(4).fill(0xff));
	});

	it("returns zero when the offset is past EOF and leaves the buffer untouched", async () => {
		const accessor = new BrowserFileAccessor(createFile([1, 2, 3]));
		const target = new Uint8Array([9, 9, 9]);

		const read = await accessor.readInto(10, target);

		expect(read).to.equal(0);
		expect(Array.from(target)).to.deep.equal([9, 9, 9]);
	});

	it("returns immediately for zero-length buffers", async () => {
		const accessor = new BrowserFileAccessor(createFile([1, 2, 3]));
		const read = await accessor.readInto(0, new Uint8Array(0));
		expect(read).to.equal(0);
	});

	it("throws when provided with a negative offset", async () => {
		const accessor = new BrowserFileAccessor(createFile([1, 2, 3]));
		const target = new Uint8Array(2);

		try {
			await accessor.readInto(-1, target);
			expect.fail("readInto should reject negative offsets");
		} catch (error) {
			expect(error).to.be.instanceOf(RangeError);
			expect((error as RangeError).message).to.match(/offset must be a non-negative integer/i);
		}
	});
});
