import React, { useCallback, useEffect, useState } from "react";
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

const defaultRenderViewer = (): React.ReactNode => (
	<RecoilRoot>
		<EditorRoot />
	</RecoilRoot>
);

type UrlFetchState =
	| { kind: "idle" }
	| { kind: "loading"; url: string }
	| { kind: "error"; url: string; message: string };

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

const fileNameFromUrl = (rawUrl: string): string => {
	try {
		const pathname = new URL(rawUrl).pathname;
		const last = pathname.split("/").filter(Boolean).pop();
		if (last) {
			return decodeURIComponent(last);
		}
	} catch {
		// fall through
	}
	return "file.uf2";
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
	const [urlFetch, setUrlFetch] = useState<UrlFetchState>({ kind: "idle" });

	const viewer = renderViewer ?? defaultRenderViewer;

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
		setUrlFetch({ kind: "idle" });
	}, []);

	useEffect(() => {
		const rawUrl = new URLSearchParams(window.location.search).get("uf2FileUrl");
		if (!rawUrl) {
			return;
		}
		let cancelled = false;
		setUrlFetch({ kind: "loading", url: rawUrl });
		(async () => {
			try {
				const response = await fetch(rawUrl);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status} ${response.statusText}`);
				}
				const blob = await response.blob();
				if (cancelled) {
					return;
				}
				const fetchedFile = new File([blob], fileNameFromUrl(rawUrl), {
					type: "application/octet-stream",
				});
				handleFileSelect(fetchedFile);
				setUrlFetch({ kind: "idle" });
			} catch (err) {
				if (cancelled) {
					return;
				}
				const message = err instanceof Error ? err.message : String(err);
				setUrlFetch({ kind: "error", url: rawUrl, message });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []); // intentionally empty: fetch runs once on mount; handleFileSelect is stable

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

	if (urlFetch.kind === "loading") {
		return (
			<div className="fdz-stage">
				<div className="sa-url-card" data-testid="url-loading">
					<div className="sa-url-spinner" aria-hidden="true" />
					<p className="sa-url-title">Loading file…</p>
					<p className="sa-url-sub sa-url-url">{urlFetch.url}</p>
				</div>
			</div>
		);
	}

	if (urlFetch.kind === "error") {
		return (
			<div className="fdz-stage">
				<div className="sa-url-card" data-testid="url-error">
					<p className="sa-url-title sa-url-error-title">Failed to load file</p>
					<p className="sa-url-sub sa-url-url">{urlFetch.url}</p>
					<p className="sa-url-sub sa-url-error-msg">{urlFetch.message}</p>
					<div className="fdz-actions" style={{ marginTop: 18 }}>
						<button
							className="fdz-btn fdz-btn-primary"
							onClick={() => setUrlFetch({ kind: "idle" })}
							type="button"
						>
							Choose a local file instead
						</button>
					</div>
				</div>
			</div>
		);
	}

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
