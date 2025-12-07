export class BrowserFileAccessor {
	constructor(private readonly file: File) {}

	name(): string {
		return this.file.name;
	}

	size(): number {
		return this.file.size;
	}

	async readInto(offset: number, target: Uint8Array): Promise<number> {
		if (!Number.isInteger(offset) || offset < 0) {
			throw new RangeError("offset must be a non-negative integer");
		}

		if (target.byteLength === 0) {
			return 0;
		}

		if (offset >= this.file.size) {
			return 0;
		}

		const end = Math.min(offset + target.byteLength, this.file.size);
		const slice = this.file.slice(offset, end);
		const arrayBuffer = await slice.arrayBuffer();
		const bytesRead = arrayBuffer.byteLength;

		if (bytesRead > 0) {
			target.set(new Uint8Array(arrayBuffer));
		}

		return bytesRead;
	}
}
