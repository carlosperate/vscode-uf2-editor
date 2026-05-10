import React, { useCallback, useEffect, useRef, useState } from "react";

export interface FileDropZoneProps {
	onFileSelect(file: File): void;
}

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

	const className = `fdz-zone${isDragging ? " fdz-dragging" : ""}`;

	return (
		<div className="fdz-stage">
			<div
				className={className}
				data-testid="file-dropzone"
				onClick={openPicker}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				role="button"
				tabIndex={0}
				onKeyDown={event => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						openPicker();
					}
				}}
			>
				<input
					aria-label="Select file"
					data-testid="file-input"
					ref={inputRef}
					onChange={onInputChange}
					style={{ display: "none" }}
					type="file"
				/>
				<div />
				<div className="fdz-content">
					<div className="fdz-mark">
						<span className="fdz-mark-uf">UF2</span>
					</div>
					<h1 className="fdz-title">UF2 File Viewer</h1>
					<p className="fdz-sub">
						Drop a file here or open a <code>.uf2</code> (or any binary) file to inspect its UF2
						metadata and raw bytes.
					</p>
					<p className="fdz-explainer">
						<strong>UF2</strong> is a binary file format designed for microcontroller boards,
						particularly suitable for flashing firmware over MSC USB (i.e. a removable flash drive).
					</p>
					<div className="fdz-actions">
						<button
							className="fdz-btn fdz-btn-primary"
							onClick={event => {
								event.stopPropagation();
								openPicker();
							}}
							type="button"
						>
							Choose file
						</button>
						<a
							className="fdz-btn fdz-btn-ghost"
							href="?uf2FileUrl=https://raw.githubusercontent.com/carlosperate/vscode-uf2-editor/main/tests/uf2_files/demo.uf2"
							onClick={event => event.stopPropagation()}
						>
							Demo mode
						</a>
					</div>
				</div>
				<div className="fdz-hint">
					Press <kbd>O</kbd> to open
				</div>
			</div>
		</div>
	);
};
