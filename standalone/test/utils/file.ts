import { Blob as NodeBlob } from "buffer";

/**
 * Provides a browser-compatible File constructor fallback so we can exercise
 * browser-only code paths inside the Node-based VS Code test runner.
 */
class PolyfillFile extends (globalThis.Blob ?? (NodeBlob as unknown as typeof Blob)) {
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

const FileCtor: typeof File =
	typeof globalThis.File === "function"
		? (globalThis.File as typeof File)
		: (PolyfillFile as unknown as typeof File);

export function createTestFile(
	contents: ArrayLike<number>,
	name = "sample.uf2",
	options?: FilePropertyBag,
): File {
	const buffer = contents instanceof Uint8Array ? contents : Uint8Array.from(contents);
	return new FileCtor([buffer], name, { type: "application/octet-stream", ...options });
}
