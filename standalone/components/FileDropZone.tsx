import React, { useCallback, useMemo, useRef, useState } from "react";

export interface FileDropZoneProps {
	onFileSelect(file: File): void;
	heading?: string;
	description?: string;
}

const baseStyle: React.CSSProperties = {
	alignItems: "center",
	border: "2px dashed var(--vscode-editor-foreground, #666)",
	borderRadius: 8,
	cursor: "pointer",
	display: "flex",
	flexDirection: "column",
	gap: "0.5rem",
	justifyContent: "center",
	minHeight: 260,
	padding: "2rem",
	textAlign: "center",
	transition: "border-color 200ms ease, background 200ms ease",
};

export const FileDropZone: React.FC<FileDropZoneProps> = ({
	onFileSelect,
	heading = "UF2 / Hex Viewer",
	description = "Drop a file here or choose one to get started.",
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

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

	const dynamicStyle = useMemo<React.CSSProperties>(() => {
		if (!isDragging) {
			return baseStyle;
		}

		return {
			...baseStyle,
			background: "rgba(255,255,255,0.05)",
			borderColor: "var(--vscode-focusBorder, #4fc1ff)",
		};
	}, [isDragging]);

	return (
		<div
			data-testid="file-dropzone"
			style={dynamicStyle}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<input
				aria-label="Select file"
				data-testid="file-input"
				ref={inputRef}
				onChange={onInputChange}
				style={{ display: "none" }}
				type="file"
			/>
			<h1>{heading}</h1>
			<p>{description}</p>
			<button onClick={() => inputRef.current?.click()} type="button">
				Choose File
			</button>
		</div>
	);
};
