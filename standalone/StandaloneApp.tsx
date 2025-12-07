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
			setFile(selectedFile);
			initializeMessaging(selectedFile);
		},
		[initializeMessaging],
	);

	if (!file) {
		return <FileDropZone onFileSelect={handleFileSelect} />;
	}

	return (
		<div
			data-testid="standalone-viewer"
			style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
		>
			<header
				style={{
					alignItems: "center",
					display: "flex",
					gap: "1rem",
					justifyContent: "space-between",
				}}
			>
				<div>
					<h2 style={{ margin: 0 }}>{file.name}</h2>
					<small>{formatBytes(file.size)}</small>
				</div>
				<button onClick={() => setFile(null)} type="button">
					Choose another file
				</button>
			</header>
			<div data-testid="standalone-viewer-root" style={{ flex: 1, minHeight: 400 }}>
				{viewer()}
			</div>
		</div>
	);
};
