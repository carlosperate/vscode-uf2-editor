export const UF2_BLOCK_SIZE = 512;
export const UF2_DATA_SIZE = 476;
export const UF2_HEADER_SIZE = 32;

export const UF2_MAGIC_START0 = 0x0a324655;
export const UF2_MAGIC_START1 = 0x9e5d5157;
export const UF2_MAGIC_END = 0x0ab16f30;

export interface Uf2Block {
	ok: true;
	flags: number;
	targetAddr: number;
	payloadSize: number;
	blockNo: number;
	numBlocks: number;
	/** Reads as a board family ID when `Uf2Flag.FamilyIdPresent` is set, file size when `FileContainer` is set, otherwise zero. */
	fileSizeOrFamilyId: number;
	/** View into the source bytes, length === payloadSize. */
	payload: Uint8Array;
	/** View into the trailing region of `data[]` (bytes payloadSize..476). Holds extension tags / file-container filename. */
	tail: Uint8Array;
}

export type Uf2ParseError = {
	ok: false;
	reason: "too-short" | "bad-magic-start" | "bad-magic-end" | "invalid-payload-size";
};

export type Uf2ParseResult = Uf2Block | Uf2ParseError;

export function parseBlock(bytes: Uint8Array, offset = 0): Uf2ParseResult {
	if (bytes.length - offset < UF2_BLOCK_SIZE) {
		return { ok: false, reason: "too-short" };
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset + offset, UF2_BLOCK_SIZE);
	if (view.getUint32(0, true) !== UF2_MAGIC_START0 || view.getUint32(4, true) !== UF2_MAGIC_START1) {
		return { ok: false, reason: "bad-magic-start" };
	}
	if (view.getUint32(508, true) !== UF2_MAGIC_END) {
		return { ok: false, reason: "bad-magic-end" };
	}

	const payloadSize = view.getUint32(16, true);
	if (payloadSize > UF2_DATA_SIZE) {
		return { ok: false, reason: "invalid-payload-size" };
	}

	const dataStart = bytes.byteOffset + offset + UF2_HEADER_SIZE;
	return {
		ok: true,
		flags: view.getUint32(8, true),
		targetAddr: view.getUint32(12, true),
		payloadSize,
		blockNo: view.getUint32(20, true),
		numBlocks: view.getUint32(24, true),
		fileSizeOrFamilyId: view.getUint32(28, true),
		payload: new Uint8Array(bytes.buffer, dataStart, payloadSize),
		tail: new Uint8Array(bytes.buffer, dataStart + payloadSize, UF2_DATA_SIZE - payloadSize),
	};
}
