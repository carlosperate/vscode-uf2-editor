import { Uf2Block } from "./block";

export interface Uf2Md5Trailer {
	regionStart: number;
	regionLength: number;
	/** 16-byte MD5 digest (view, no copy). */
	md5: Uint8Array;
}

const TRAILER_SIZE = 24;

/**
 * For blocks with the `Md5Present` flag set, the last 24 bytes of `data[]`
 * encode `{ regionStart: u32, regionLength: u32, md5: 16 bytes }`. In practice
 * `payloadSize <= 452`, so the trailer always lives inside `block.tail` —
 * if not, we return `null` rather than reaching past the data region.
 */
export function parseMd5Trailer(block: Uf2Block): Uf2Md5Trailer | null {
	const tail = block.tail;
	if (tail.byteLength < TRAILER_SIZE) return null;
	const start = tail.byteLength - TRAILER_SIZE;
	const view = new DataView(tail.buffer, tail.byteOffset + start, TRAILER_SIZE);
	return {
		regionStart: view.getUint32(0, true),
		regionLength: view.getUint32(4, true),
		md5: tail.subarray(start + 8, start + TRAILER_SIZE),
	};
}
