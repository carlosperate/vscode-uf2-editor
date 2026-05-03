import React, { useCallback, useMemo, useState } from "react";
import { RecoilRoot } from "recoil";
import { EditorRoot } from "../media/editor/EditorRoot";
import { BrowserFileAccessor } from "./BrowserFileAccessor";
import { FileDropZone } from "./components/FileDropZone";
import { MockMessageHandler } from "./MockMessageHandler";
import { initializeVsCodeApi } from "./vscodeApiMock";

export type InitializeMessagingFn = (file: File) => void;

const defaultInitializeMessaging: InitializeMessagingFn = file => {
	const accessor = new BrowserFileAccessor(file);
	const handler = new MockMessageHandler(accessor);
	initializeVsCodeApi(handler);
};

export interface StandaloneAppProps {
	initializeMessaging?: InitializeMessagingFn;
	renderViewer?: () => React.ReactNode;
}

const formatBytes = (size: number): string => {
	if (size < 1024) {
		return `${size} B`;
	}
	const kb = size / 1024;
	if (kb < 1024) {
		return `${kb.toFixed(1)} KB`;
	}
	const mb = kb / 1024;
	return `${mb.toFixed(1)} MB`;
};

const dropZoneStyle: React.CSSProperties = {
	alignItems: "center",
	display: "flex",
	height: "100vh",
	justifyContent: "center",
	padding: "2rem",
	boxSizing: "border-box",
};

const viewerWrapStyle: React.CSSProperties = {
	position: "fixed",
	inset: 0,
	overflow: "hidden",
};

const infoBarStyle: React.CSSProperties = {
	alignItems: "center",
	background: "var(--vscode-editorWidget-background, #252526)",
	borderBottom: "1px solid var(--vscode-editorWidget-border, #454545)",
	display: "flex",
	gap: "1rem",
	justifyContent: "space-between",
	left: 0,
	padding: "4px 12px",
	position: "absolute",
	right: 0,
	top: 0,
	zIndex: 10,
};

const editorSlotStyle: React.CSSProperties = {
	position: "absolute",
	inset: 0,
};

export const StandaloneApp: React.FC<StandaloneAppProps> = ({
	initializeMessaging = defaultInitializeMessaging,
	renderViewer,
}) => {
	const [file, setFile] = useState<File | null>(null);
	const [infoBarHeight, setInfoBarHeight] = useState(0);

	const infoBarRef = useCallback((el: HTMLDivElement | null) => {
		if (el) {
			setInfoBarHeight(el.getBoundingClientRect().height);
		}
	}, []);

	const viewer = useMemo(
		() =>
			renderViewer ??
			(() => (
				<RecoilRoot>
					<EditorRoot />
				</RecoilRoot>
			)),
		[renderViewer],
	);

	const handleFileSelect = useCallback(
		(selectedFile: File) => {
			setFile(selectedFile);
			initializeMessaging(selectedFile);
		},
		[initializeMessaging],
	);

	if (!file) {
		return (
			<div style={dropZoneStyle}>
				<FileDropZone onFileSelect={handleFileSelect} />
			</div>
		);
	}

	return (
		<div data-testid="standalone-viewer" style={viewerWrapStyle}>
			<div ref={infoBarRef} style={infoBarStyle}>
				<div>
					<strong
						style={{
							color: "var(--vscode-editorWidget-foreground, #cccccc)",
							fontSize: "0.9em",
						}}
					>
						{file.name}
					</strong>
					<span
						style={{
							color: "var(--vscode-editorLineNumber-foreground, #858585)",
							fontSize: "0.8em",
							marginLeft: "0.5rem",
						}}
					>
						{formatBytes(file.size)}
					</span>
				</div>
				<button
					onClick={() => setFile(null)}
					style={{
						background: "var(--vscode-button-secondaryBackground, #3a3d41)",
						border: "1px solid var(--vscode-button-border, transparent)",
						color: "var(--vscode-button-secondaryForeground, #cccccc)",
						cursor: "pointer",
						fontSize: "0.8em",
						padding: "3px 8px",
					}}
					type="button"
				>
					Choose another file
				</button>
			</div>
			<div
				data-testid="standalone-viewer-root"
				key={`${file.name}-${file.size}-${file.lastModified}`}
				style={{ ...editorSlotStyle, top: infoBarHeight }}
			>
				{viewer()}
			</div>
		</div>
	);
};
