import React, { useCallback, useEffect, useRef, useState } from "react";

export interface FileDropZoneProps {
	onFileSelect(file: File): void;
}

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const DEMO_HREF =
	"?uf2FileUrl=https://raw.githubusercontent.com/carlosperate/vscode-uf2-editor/main/tests/uf2_files/demo.uf2";

/** Block 0 header of the demo file, decoded as the viewer's inspector shows it. */
const HEADER_ROWS: { key: string; offset: string; label: string; value: string; note?: string }[] =
	[
		{ key: "magic", offset: "0x00", label: "Magic", value: "0x0A324655 0x9E5D5157" },
		{
			key: "flags",
			offset: "0x08",
			label: "Flags",
			value: "0x0000A001",
			note: "not main flash, familyID, ext tags",
		},
		{ key: "addr", offset: "0x0C", label: "Address", value: "0x10000000" },
		{ key: "payload", offset: "0x10", label: "Payload", value: "256 bytes" },
		{ key: "blockno", offset: "0x14", label: "Block Number", value: "0" },
		{ key: "numblocks", offset: "0x18", label: "Blocks Total", value: "3" },
		{ key: "family", offset: "0x1C", label: "Family ID", value: "0x57755A57", note: "STM32F4" },
	];

export const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileSelect }) => {
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const openPicker = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const handleFiles = useCallback(
		(files: FileList | null | undefined) => {
			const file = files && files[0];
			if (file) {
				onFileSelect(file);
			}
		},
		[onFileSelect],
	);

	const onInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			handleFiles(event.target.files);
		},
		[handleFiles],
	);

	const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(true);
	}, []);

	const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
		if (event.currentTarget.contains(event.relatedTarget as Node)) {
			return;
		}
		setIsDragging(false);
	}, []);

	const onDrop = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(false);
			handleFiles(event.dataTransfer?.files);
		},
		[handleFiles],
	);

	useEffect(() => {
		// Needs a modifier: a bare letter shortcut fires by accident for speech-input users (WCAG 2.1.4).
		const onKeyDown = (event: KeyboardEvent) => {
			const modifier = IS_MAC ? event.metaKey : event.ctrlKey;
			if (modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "o") {
				event.preventDefault();
				openPicker();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [openPicker]);

	return (
		<main className="sa-cq">
			<div
				className={`sa-overlay${isDragging ? " sa-dragging" : ""}`}
				data-testid="file-dropzone"
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				<div className="sa-col-left">
					<div className="sa-inner">
						<h1 className="sa-h1">UF2 File Viewer</h1>
						<p className="sa-lede">
							<b>UF2</b> (USB Flashing Format) is a file format for flashing microcontrollers over
							USB mass storage, where the board is mounted as a USB drive. This viewer decodes .uf2
							files to analyse their <b>512-byte blocks</b>, showing every metadata field next to
							its raw data. Files are decoded in your browser and never uploaded anywhere.
						</p>
						<div className="sa-colstack">
							<div className="sa-actions">
								<button className="sa-btn sa-btn-primary" onClick={openPicker} type="button">
									Open file…
								</button>
								<a className="sa-btn sa-btn-ghost" href={DEMO_HREF}>
									Load demo image
								</a>
							</div>
							<div className="sa-drop">
								You can also drop a file anywhere on this page.{" "}
								<span className="sa-kbd-hint">
									Press {IS_MAC ? <kbd>⌘O</kbd> : <kbd>Ctrl+O</kbd>} to browse.
								</span>
							</div>
						</div>
						<input
							aria-label="Select file"
							data-testid="file-input"
							ref={inputRef}
							onChange={onInputChange}
							style={{ display: "none" }}
							type="file"
						/>
					</div>
				</div>
				<div className="sa-col-right">
					<figure className="sa-inner sa-tablefig">
						<table className="sa-htable">
							<thead>
								<tr>
									<th>Offset</th>
									<th>Field</th>
									<th>Value</th>
								</tr>
							</thead>
							<tbody>
								{HEADER_ROWS.map(row => (
									<tr className={`sa-field-${row.key}`} key={row.key}>
										<td className="sa-off">{row.offset}</td>
										<td className="sa-fld">
											<span className="sa-swatch" aria-hidden="true" />
											{row.label}
										</td>
										<td className="sa-val">
											{row.value}
											{row.note && <span className="sa-note">{row.note}</span>}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</figure>
				</div>
			</div>
		</main>
	);
};
