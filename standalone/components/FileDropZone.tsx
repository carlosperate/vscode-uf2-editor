import React, { useCallback, useEffect, useRef, useState } from "react";

export interface FileDropZoneProps {
	onFileSelect(file: File): void;
}

const DEMO_HREF =
	"?uf2FileUrl=https://raw.githubusercontent.com/carlosperate/vscode-uf2-editor/main/tests/uf2_files/demo.uf2";

/** Sample block-0 header used for the illustrative field map on the right. */
const HEADER_FIELDS: { key: string; label: string; bytes: { hex: string; zero?: boolean }[] }[] = [
	{
		key: "magic",
		label: "magic",
		bytes: ["55", "46", "32", "0A", "57", "51", "5D", "9E"].map(hex => ({ hex })),
	},
	{
		key: "flags",
		label: "flags",
		bytes: [{ hex: "01" }, { hex: "A0" }, { hex: "00", zero: true }, { hex: "00", zero: true }],
	},
	{
		key: "addr",
		label: "address",
		bytes: [
			{ hex: "00", zero: true },
			{ hex: "00", zero: true },
			{ hex: "00", zero: true },
			{ hex: "10" },
		],
	},
	{
		key: "payload",
		label: "payload",
		bytes: [
			{ hex: "00", zero: true },
			{ hex: "01" },
			{ hex: "00", zero: true },
			{ hex: "00", zero: true },
		],
	},
	{
		key: "family",
		label: "family id",
		bytes: ["10", "0D", "F1", "D5"].map(hex => ({ hex })),
	},
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
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			const target = event.target as HTMLElement | null;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
				return;
			}
			if (event.key === "o" || event.key === "O") {
				event.preventDefault();
				openPicker();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [openPicker]);

	return (
		<div className="fdz-cq">
			<div
				className={`fdz-overlay${isDragging ? " fdz-dragging" : ""}`}
				data-testid="file-dropzone"
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				<div className="fdz-col-left">
					<div className="fdz-inner">
						<h1 className="fdz-h1">UF2 File Viewer</h1>
						<p className="fdz-lede">
							<b>UF2</b> is a binary format for designed for flashing microcontrollers over MSC USB
							(mass storage, i.e. a USB drive). This viewer decodes their <b>512-byte blocks</b>,
							its header fields, content and raw bytes for inspection.
						</p>
						<div className="fdz-colstack">
							<div className="fdz-actions">
								<button className="fdz-btn fdz-btn-primary" onClick={openPicker} type="button">
									Open file…
								</button>
								<a className="fdz-btn fdz-btn-ghost" href={DEMO_HREF}>
									Load demo image
								</a>
							</div>
							<div className="fdz-drop">
								Drop a file here, or anywhere on the window. Press <kbd>O</kbd> to browse.
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
				<div className="fdz-col-right">
					<div className="fdz-inner">
						<div className="fdz-righthead">block 0 · 32-byte header</div>
						<div className="fdz-fmap">
							{HEADER_FIELDS.map(field => (
								<div className={`fdz-field fdz-field-${field.key}`} key={field.key}>
									<div className="fdz-nm">{field.label}</div>
									<div className="fdz-bytes">
										{field.bytes.map((byte, index) => (
											<b className={byte.zero ? "fdz-z" : undefined} key={index}>
												{byte.hex}
											</b>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
