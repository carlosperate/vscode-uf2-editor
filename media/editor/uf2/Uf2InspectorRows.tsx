import React from "react";
import { Uf2ParseResult } from "../../../shared/uf2/block";
import { Uf2FieldKind } from "../../../shared/uf2/fieldKinds";
import { Uf2Flag, hasFlag } from "../../../shared/uf2/flags";
import _styles from "./uf2InspectorRows.css";
import { clsx, throwOnUndefinedAccessInDev } from "../util";

const styles = throwOnUndefinedAccessInDev(_styles);

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

/** Maps a hovered cell's Uf2FieldKind to the inspector row it corresponds to. */
type InspectorRow = "blockNo" | "numBlocks" | "addr" | "payloadSize" | "payloadData" | "family" | "flags";

const INSPECTOR_ROW_FOR_KIND = new Map<number, InspectorRow>([
	[Uf2FieldKind.BlockNo, "blockNo"],
	[Uf2FieldKind.NumBlocks, "numBlocks"],
	[Uf2FieldKind.TargetAddr, "addr"],
	[Uf2FieldKind.PayloadSize, "payloadSize"],
	[Uf2FieldKind.Data, "payloadData"],
	[Uf2FieldKind.Padding, "payloadData"],
	[Uf2FieldKind.FileSizeOrFamilyId, "family"],
	[Uf2FieldKind.Flags, "flags"],
]);

/**
 * UF2 block fields rendered as `<dt>/<dd>` pairs, intended to live inside the
 * Data Inspector's `<dl>` grid. Pure component — takes a parsed result and
 * renders rows; gating on "is this a UF2 file" is the caller's job.
 */
export const Uf2InspectorRows: React.FC<{
	result: Uf2ParseResult;
	hoveredFieldKind?: number;
}> = ({ result, hoveredFieldKind }) => {
	const hoveredRow: InspectorRow | undefined =
		hoveredFieldKind !== undefined ? INSPECTOR_ROW_FOR_KIND.get(hoveredFieldKind) : undefined;

	if (!result.ok) {
		return (
			<>
				<dt>UF2 Block</dt>
				<dd data-testid="uf2-block-error">Invalid UF2 block</dd>
			</>
		);
	}

	return (
		<>
			<dt className={clsx(styles.fieldBlockNo, (hoveredRow === "blockNo" || hoveredRow === "numBlocks") && styles.rowHighlighted)}>Block</dt>
			<dd>
				<span className={clsx(hoveredRow === "blockNo" && styles.valueHighlighted)}>{result.blockNo}</span>
				{" / "}
				<span className={clsx(hoveredRow === "numBlocks" && styles.valueHighlighted)}>{result.numBlocks}</span>
			</dd>
			<dt className={clsx(styles.fieldTargetAddr, hoveredRow === "addr" && styles.rowHighlighted)}>Address</dt>
			<dd data-testid="uf2-block-target-addr">{hex(result.targetAddr)}</dd>
			<dt className={clsx(styles.fieldPayloadSize, (hoveredRow === "payloadSize" || hoveredRow === "payloadData") && styles.rowHighlighted)}>Payload</dt>
			<dd>
				<span className={clsx(hoveredRow === "payloadSize" && styles.valueHighlighted)}>{result.payloadSize}</span>
				{" bytes"}
			</dd>
			{hasFlag(result.flags, Uf2Flag.FamilyIdPresent) && (
				<>
					<dt className={clsx(styles.fieldFileFamily, hoveredRow === "family" && styles.rowHighlighted)}>Family ID</dt>
					<dd data-testid="uf2-block-family-id">{hex(result.fileSizeOrFamilyId)}</dd>
				</>
			)}
			<dt className={clsx(styles.fieldFlags, hoveredRow === "flags" && styles.rowHighlighted)}>Flags</dt>
			<dd>{formatFlags(result.flags)}</dd>
		</>
	);
};
