import { UF2_BLOCK_SIZE, UF2_MAGIC_END, UF2_MAGIC_START0, UF2_MAGIC_START1 } from "./block";

/**
 * Cheap structural check: does the buffer start with a well-formed UF2 block?
 * Avoids running the full parser when all we need is "is this a UF2 file?".
 */
export function isUf2(bytes: Uint8Array): boolean {
	if (bytes.length < UF2_BLOCK_SIZE) return false;
	const view = new DataView(bytes.buffer, bytes.byteOffset, UF2_BLOCK_SIZE);
	return (
		view.getUint32(0, true) === UF2_MAGIC_START0 &&
		view.getUint32(4, true) === UF2_MAGIC_START1 &&
		view.getUint32(508, true) === UF2_MAGIC_END
	);
}
