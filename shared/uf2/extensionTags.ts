import { Uf2Block } from "./block";

export const Uf2TagType = {
	Version: 0x9fc7bc,
	Description: 0x650d9d,
	PageSize: 0x0be9f7,
	Sha2Checksum: 0xb46db0,
	DeviceTypeId: 0xc8a729,
} as const;

export interface Uf2ExtensionTag {
	/** 24-bit type identifier. */
	type: number;
	/** Tag payload (view, no copy). May include trailing zero-padding to 4-byte alignment. */
	data: Uint8Array;
}

/**
 * Walks the extension-tag stream that lives in `block.tail` (i.e. starting at
 * data[payloadSize]). Stops at the size=0,type=0 terminator or when the tail
 * runs out. Bad sizes (zero, beyond bounds) terminate the walk silently — the
 * caller still gets every well-formed tag that came before.
 */
export function parseExtensionTags(block: Uf2Block): Uf2ExtensionTag[] {
	const out: Uf2ExtensionTag[] = [];
	const tail = block.tail;
	const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
	let pos = 0;
	while (pos + 4 <= tail.byteLength) {
		const size = view.getUint8(pos);
		const type = view.getUint8(pos + 1) | (view.getUint8(pos + 2) << 8) | (view.getUint8(pos + 3) << 16);
		if (size === 0 && type === 0) break;
		if (size < 4 || pos + size > tail.byteLength) break;
		out.push({ type, data: tail.subarray(pos + 4, pos + size) });
		pos += (size + 3) & ~3; // advance to next 4-byte boundary
	}
	return out;
}
