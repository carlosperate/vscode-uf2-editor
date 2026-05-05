import React, { Suspense, useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { Endianness } from "../../shared/protocol";
import { FocusedElement, useDisplayContext } from "./dataDisplayContext";
import _style from "./dataInspector.css";
import { inspectableTypes } from "./dataInspectorProperties";
import { useFileBytes, usePersistedState } from "./hooks";
import * as select from "./state";
import { strings } from "./strings";
import { blockAtOffset, isUf2FileSelector } from "./uf2/blockSelectors";
import { Uf2InspectorRows } from "./uf2/Uf2InspectorRows";
import { throwOnUndefinedAccessInDev } from "./util";
// Tooltip popover import removed with hover inspector deletion

const style = throwOnUndefinedAccessInDev(_style);

// Hover inspector removed; always showing Aside variant.

/** Data inspector view shown to the right hand side of the hex editor. */
export const DataInspectorAside: React.FC<{ onInspecting?(isInspecting: boolean): void }> = ({
	onInspecting,
}) => {
	const ctx = useDisplayContext();
	const [inspected, setInspected] = useState<FocusedElement | undefined>(ctx.focusedElement);

	useEffect(() => {
		const disposable = ctx.onDidFocus(focused => {
			if (!inspected) {
				onInspecting?.(true);
			}
			if (focused) {
				setInspected(focused);
			}
		});
		return () => disposable.dispose();
	}, []);

	if (!inspected) {
		return null;
	}

	return (
		<Suspense fallback={null}>
			<InspectorContents columns={2} offset={inspected.byte} />
		</Suspense>
	);
};

const lookahead = 8;

/** Inner contents of the data inspector. */
const InspectorContents: React.FC<{
	offset: number;
	columns: number;
}> = ({ offset, columns }) => {
	const defaultEndianness = useRecoilValue(select.editorSettings).defaultEndianness;
	const [endianness, setEndianness] = usePersistedState("endianness", defaultEndianness);
	const target = useFileBytes(offset, lookahead);
	const dv = new DataView(target.buffer);
	const le = endianness === Endianness.Little;

	const gridTemplate = "max-content ".repeat(columns);

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

/**
 * Renders the "UF2 Block Info" subsection above the typed inspector when
 * the file is UF2. Heading + rows live in the same section so the grid
 * sizing matches the lower one.
 */
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
	const result = useRecoilValue(blockAtOffset(offset));
	return <Uf2InspectorRows result={result} />;
};

/** Controlled checkbox that toggles between little and big endian. */
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
