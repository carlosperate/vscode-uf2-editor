import React, { Suspense, useEffect, useState, useTransition } from "react";
import { useRecoilValue } from "recoil";
import { Endianness } from "../../shared/protocol";
import { useDisplayContext } from "./dataDisplayContext";
import _style from "./dataInspector.css";
import { inspectableTypes } from "./dataInspectorProperties";
import { useFileBytes, usePersistedState } from "./hooks";
import * as select from "./state";
import { strings } from "./strings";
import { UF2_BLOCK_SIZE } from "../../shared/uf2/block";
import { blockAtOffset, isUf2FileSelector } from "./uf2/blockSelectors";
import { Uf2InspectorRows } from "./uf2/Uf2InspectorRows";
import { throwOnUndefinedAccessInDev } from "./util";

const style = throwOnUndefinedAccessInDev(_style);

const COLUMNS = 2;
const LOOKAHEAD = 8;

/** Always-visible UF2 Data Inspector. Follows the hovered byte; falls back to the last clicked. */
export const DataInspector: React.FC = () => {
	const ctx = useDisplayContext();
	const [clickedOffset, setClickedOffset] = useState<number>(ctx.focusedElement?.byte ?? 0);
	const [hoveredOffset, setHoveredOffset] = useState<number | undefined>(undefined);
	const [, startTransition] = useTransition();

	useEffect(() => {
		const a = ctx.onDidFocus(focused => { if (focused) setClickedOffset(focused.byte); });
		const b = ctx.onDidHover(hovered => {
			startTransition(() => setHoveredOffset(hovered?.byte));
		});
		return () => { a.dispose(); b.dispose(); };
	}, []);

	return (
		<Suspense fallback={null}>
			<InspectorContents offset={hoveredOffset ?? clickedOffset} />
		</Suspense>
	);
};

const InspectorContents: React.FC<{ offset: number }> = ({ offset }) => {
	const defaultEndianness = useRecoilValue(select.editorSettings).defaultEndianness;
	const [endianness, setEndianness] = usePersistedState("endianness", defaultEndianness);
	const target = useFileBytes(offset, LOOKAHEAD);
	const dv = new DataView(target.buffer);
	const le = endianness === Endianness.Little;
	const gridTemplate = "max-content ".repeat(COLUMNS);

	return (
		<>
			<Uf2BlockSection offset={offset} gridTemplate={gridTemplate} />
			<h4 className={style.sectionHeading}>Selected Data Inspector</h4>
			<dl className={style.types} style={{ gridTemplateColumns: gridTemplate }}>
				{inspectableTypes.map(({ label, convert, minBytes }) => (
					<React.Fragment key={label}>
						<dt>{label}</dt>
						<dd>
							{target.length < minBytes ? (
								<span style={{ opacity: 0.8 }}>End of File</span>
							) : (
								convert(dv, le)
							)}
						</dd>
					</React.Fragment>
				))}
			</dl>
			<EndiannessToggle endianness={endianness} setEndianness={setEndianness} />
		</>
	);
};

/** "UF2 Block Info" subsection above the typed inspector, only when the file is UF2. */
const Uf2BlockSection: React.FC<{ offset: number; gridTemplate: string }> = ({
	offset,
	gridTemplate,
}) => {
	const isUf2 = useRecoilValue(isUf2FileSelector);
	if (!isUf2) return null;
	return (
		<Suspense fallback={null}>
			<h4 className={style.sectionHeading}>UF2 Block Info</h4>
			<dl className={style.types} style={{ gridTemplateColumns: gridTemplate }}>
				<Uf2BlockRows offset={offset} />
			</dl>
		</Suspense>
	);
};

const Uf2BlockRows: React.FC<{ offset: number }> = ({ offset }) => {
	// Normalize to block-start so all bytes in the same 512-byte block share one
	// cached selector instance — otherwise every hovered byte triggers a new async lookup.
	const blockOffset = Math.floor(offset / UF2_BLOCK_SIZE) * UF2_BLOCK_SIZE;
	const result = useRecoilValue(blockAtOffset(blockOffset));
	const hoveredFieldKind = useRecoilValue(select.hoveredUf2FieldKind);
	return <Uf2InspectorRows result={result} hoveredFieldKind={hoveredFieldKind} />;
};

const EndiannessToggle: React.FC<{
	endianness: Endianness;
	setEndianness: (e: Endianness) => void;
}> = ({ endianness, setEndianness }) => (
	<div className={style.endiannessToggleContainer}>
		<input
			type="checkbox"
			id="endian-checkbox"
			checked={endianness === Endianness.Little}
			onChange={evt => setEndianness(evt.target.checked ? Endianness.Little : Endianness.Big)}
		/>
		<label htmlFor="endian-checkbox">{strings.littleEndian}</label>
	</div>
);
