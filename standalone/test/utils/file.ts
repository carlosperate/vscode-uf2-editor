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

/**
 * Loads a UF2 fixture file from `tests/uf2_files/` by name.
 * Only works in the Node-based VS Code test runner (uses `fs` + `path`).
 * `__dirname` resolves to `dist-extension/` in the bundle, so `..` is the project root.
 */
export function loadFixture(filename: string): File {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const fs = require("fs") as typeof import("fs");
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const path = require("path") as typeof import("path");
	const buf: Buffer = fs.readFileSync(path.join(__dirname, "..", "tests", "uf2_files", filename));
	return createTestFile(buf, filename);
}
