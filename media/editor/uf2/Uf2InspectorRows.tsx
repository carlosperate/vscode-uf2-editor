import React from "react";
import { Uf2ParseResult } from "../../../shared/uf2/block";
import { Uf2Flag, hasFlag } from "../../../shared/uf2/flags";

const hex = (value: number, width = 8): string =>
	"0x" + value.toString(16).toUpperCase().padStart(width, "0");

const FLAG_LABELS: ReadonlyArray<{ flag: Uf2Flag; label: string }> = [
	{ flag: Uf2Flag.NotMainFlash, label: "not main flash" },
	{ flag: Uf2Flag.FileContainer, label: "file container" },
	{ flag: Uf2Flag.FamilyIdPresent, label: "familyID" },
	{ flag: Uf2Flag.Md5Present, label: "MD5" },
	{ flag: Uf2Flag.ExtensionTags, label: "ext tags" },
];

const formatFlags = (flags: number): string => {
	if (flags === 0) return "none";
	return FLAG_LABELS.filter(f => hasFlag(flags, f.flag))
		.map(f => f.label)
		.join(", ") || hex(flags);
};

/**
 * UF2 block fields rendered as `<dt>/<dd>` pairs, intended to live inside the
 * Data Inspector's `<dl>` grid. Pure component — takes a parsed result and
 * renders rows; gating on "is this a UF2 file" is the caller's job.
 */
export const Uf2InspectorRows: React.FC<{ result: Uf2ParseResult }> = ({ result }) => {
	if (!result.ok) {
		return (
			<>
				<dt>UF2 Block</dt>
				<dd data-testid="uf2-block-error">parse error: {result.reason}</dd>
			</>
		);
	}

	return (
		<>
			<dt>Block</dt>
			<dd>
				{result.blockNo} / {result.numBlocks}
			</dd>
			<dt>Address</dt>
			<dd data-testid="uf2-block-target-addr">{hex(result.targetAddr)}</dd>
			<dt>Payload</dt>
			<dd>{result.payloadSize} bytes</dd>
			{hasFlag(result.flags, Uf2Flag.FamilyIdPresent) && (
				<>
					<dt>Family ID</dt>
					<dd data-testid="uf2-block-family-id">{hex(result.fileSizeOrFamilyId)}</dd>
				</>
			)}
			<dt>Flags</dt>
			<dd>{formatFlags(result.flags)}</dd>
		</>
	);
};
