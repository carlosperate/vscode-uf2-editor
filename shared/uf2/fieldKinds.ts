export const enum Uf2FieldKind {
	MagicHeader, // bytes 0–7 (magicStart0 + magicStart1)
	Flags, // bytes 8–11
	TargetAddr, // bytes 12–15
	PayloadSize, // bytes 16–19
	BlockNo, // bytes 20–23
	NumBlocks, // bytes 24–27
	FileSizeOrFamilyId, // bytes 28–31
	Data, // bytes 32–(32+payloadSize-1): actual payload
	Padding, // bytes (32+payloadSize)–507: unused / extension-tag area
	MagicEnd, // bytes 508–511
}

export function uf2FieldLabel(kind: Uf2FieldKind): string {
	switch (kind) {
		case Uf2FieldKind.MagicHeader: return "Magic Header";
		case Uf2FieldKind.Flags: return "Flags";
		case Uf2FieldKind.TargetAddr: return "Target Address";
		case Uf2FieldKind.PayloadSize: return "Payload Size";
		case Uf2FieldKind.BlockNo: return "Block Number";
		case Uf2FieldKind.NumBlocks: return "Total Blocks";
		case Uf2FieldKind.FileSizeOrFamilyId: return "Family ID / File Size";
		case Uf2FieldKind.Data: return "Payload Data";
		case Uf2FieldKind.Padding: return "Padding";
		case Uf2FieldKind.MagicEnd: return "Magic Footer";
	}
}

/**
 * Returns the UF2 field that owns `blockOffset` (0–511 within a 512-byte block).
 * Pass `payloadSize` (from the parsed block) to distinguish `Data` from `Padding`;
 * omit it to treat the entire 32–507 range as `Data`.
 */
export function uf2FieldKindForOffset(blockOffset: number, payloadSize?: number): Uf2FieldKind {
	if (blockOffset < 8) return Uf2FieldKind.MagicHeader;
	if (blockOffset < 12) return Uf2FieldKind.Flags;
	if (blockOffset < 16) return Uf2FieldKind.TargetAddr;
	if (blockOffset < 20) return Uf2FieldKind.PayloadSize;
	if (blockOffset < 24) return Uf2FieldKind.BlockNo;
	if (blockOffset < 28) return Uf2FieldKind.NumBlocks;
	if (blockOffset < 32) return Uf2FieldKind.FileSizeOrFamilyId;
	if (blockOffset < 508) {
		if (payloadSize !== undefined && blockOffset >= 32 + payloadSize) {
			return Uf2FieldKind.Padding;
		}
		return Uf2FieldKind.Data;
	}
	return Uf2FieldKind.MagicEnd;
}
