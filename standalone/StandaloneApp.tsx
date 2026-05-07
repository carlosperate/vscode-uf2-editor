import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RecoilRoot } from "recoil";
import { EditorRoot } from "../media/editor/EditorRoot";
import { bumpWebviewSession } from "../media/editor/state";
import { BrowserFileAccessor } from "./BrowserFileAccessor";
import { FileDropZone } from "./components/FileDropZone";
import { MockMessageHandler } from "./MockMessageHandler";
import { initializeVsCodeApi, resetVsCodeApiMock } from "./vscodeApiMock";

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

const TOPBAR_HEIGHT = 48;

const viewerWrapStyle: React.CSSProperties = {
	position: "fixed",
	inset: 0,
	overflow: "hidden",
};

const editorSlotStyle: React.CSSProperties = {
	position: "absolute",
	left: 0,
	right: 0,
	bottom: 0,
	top: TOPBAR_HEIGHT,
};

export const StandaloneApp: React.FC<StandaloneAppProps> = ({
	initializeMessaging = defaultInitializeMessaging,
	renderViewer,
}) => {
	const [file, setFile] = useState<File | null>(null);

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
			resetVsCodeApiMock();
			bumpWebviewSession();
			setFile(selectedFile);
			initializeMessaging(selectedFile);
		},
		[initializeMessaging],
	);

	const closeFile = useCallback(() => {
		resetVsCodeApiMock();
		setFile(null);
	}, []);

	useEffect(() => {
		if (!file) {
			return;
		}
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.altKey) {
				const target = event.target as HTMLElement | null;
				if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
					return;
				}
				closeFile();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [file, closeFile]);

	if (!file) {
		return <FileDropZone onFileSelect={handleFileSelect} />;
	}

	return (
		<div data-testid="standalone-viewer" style={viewerWrapStyle}>
			<div className="sa-topbar">
				<div className="sa-pill">
					<span className="sa-pill-dot" />
					<span className="sa-pill-name">{file.name}</span>
					<span className="sa-pill-meta">{formatBytes(file.size)}</span>
				</div>
				<div className="sa-spacer" />
				<button className="fdz-btn" onClick={closeFile} type="button">
					Choose another file
				</button>
			</div>
			<div
				data-testid="standalone-viewer-root"
				key={`${file.name}-${file.size}-${file.lastModified}`}
				style={editorSlotStyle}
			>
				{viewer()}
			</div>
		</div>
	);
};
