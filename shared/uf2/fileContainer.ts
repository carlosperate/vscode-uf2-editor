import { Uf2Block } from "./block";

export interface Uf2FileContainer {
	filename: string;
	fileSize: number;
	offsetInFile: number;
}

/**
 * For blocks with the `FileContainer` flag set:
 * - `targetAddr` is the offset within the embedded file
 * - `fileSizeOrFamilyId` holds the embedded file's total size
 * - the NUL-terminated filename sits at `data[payloadSize..]`, i.e. at the start of `block.tail`
 *
 * Returns `null` if the filename region is empty (no NUL or zero-length tail).
 */
export function parseFileContainer(block: Uf2Block): Uf2FileContainer | null {
	const tail = block.tail;
	const nul = tail.indexOf(0);
	if (nul <= 0) return null;
	let filename = "";
	for (let i = 0; i < nul; i++) filename += String.fromCharCode(tail[i]);
	return {
		filename,
		fileSize: block.fileSizeOrFamilyId,
		offsetInFile: block.targetAddr,
	};
}
