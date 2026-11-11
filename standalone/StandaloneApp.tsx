import React, { useCallback, useEffect, useRef, useState } from "react";
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

// Drops ?uf2FileUrl so a reload doesn't reopen a file the user has moved away from.
const clearFileUrlParam = (): void => {
	const url = new URL(window.location.href);
	if (url.searchParams.has("uf2FileUrl")) {
		url.searchParams.delete("uf2FileUrl");
		window.history.replaceState(null, "", url);
	}
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
		clearFileUrlParam();
		setFile(null);
		setUrlFetch({ kind: "idle" });
	}, []);

	const pickerRef = useRef<HTMLInputElement | null>(null);
	const onPickAnother = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const picked = event.target.files?.[0];
			// Reset so picking the same file again still fires a change event.
			event.target.value = "";
			if (picked) {
				clearFileUrlParam();
				handleFileSelect(picked);
			}
		},
		[handleFileSelect],
	);

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
					throw new Error(
						`The server replied with HTTP ${response.status} ${response.statusText}. Check the link points to a .uf2 file that exists.`,
					);
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
				// Browsers report both network failures and CORS blocks as a bare TypeError.
				const message =
					err instanceof TypeError
						? "The download didn't go through. The server may be offline, or it may not allow other websites to read its files (CORS). Download the file and open it from your computer instead."
						: err instanceof Error
							? err.message
							: String(err);
				setUrlFetch({ kind: "error", url: rawUrl, message });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []); // intentionally empty: fetch runs once on mount; handleFileSelect is stable

	if (urlFetch.kind === "loading") {
		return (
			<main className="sa-stage">
				<div className="sa-url-card" data-testid="url-loading" role="status">
					<div className="sa-url-spinner" aria-hidden="true" />
					<h1 className="sa-url-title">Loading file…</h1>
					<p className="sa-url-sub sa-url-url">{urlFetch.url}</p>
				</div>
			</main>
		);
	}

	if (urlFetch.kind === "error") {
		return (
			<main className="sa-stage">
				<div className="sa-url-card" data-testid="url-error" role="alert">
					<h1 className="sa-url-title sa-url-error-title">Failed to load file</h1>
					<p className="sa-url-sub sa-url-url">{urlFetch.url}</p>
					<p className="sa-url-sub sa-url-error-msg">{urlFetch.message}</p>
					<div className="sa-actions sa-url-actions">
						<button
							className="sa-btn sa-btn-primary"
							onClick={() => setUrlFetch({ kind: "idle" })}
							type="button"
						>
							Choose a local file instead
						</button>
					</div>
				</div>
			</main>
		);
	}

	if (!file) {
		return <FileDropZone onFileSelect={handleFileSelect} />;
	}

	return (
		<div data-testid="standalone-viewer" style={viewerWrapStyle}>
			<header className="sa-topbar">
				<button
					className="sa-btn sa-btn-quiet sa-btn-compact"
					onClick={closeFile}
					title="Back to the start page"
					type="button"
				>
					<svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
						<path d="M7.35 2.65l.7.7L3.91 7.5H14v1H3.91l4.14 4.15-.7.7L2 8z" />
					</svg>
					Back
				</button>
				<div className="sa-file">
					<span className="sa-file-name">{file.name}</span>
					<span className="sa-file-size">{formatBytes(file.size)}</span>
				</div>
				<div className="sa-spacer" />
				<button
					className="sa-btn sa-btn-primary sa-btn-compact"
					onClick={() => pickerRef.current?.click()}
					type="button"
				>
					Open file…
				</button>
				<input
					aria-label="Open a different file"
					onChange={onPickAnother}
					ref={pickerRef}
					style={{ display: "none" }}
					type="file"
				/>
			</header>
			<main
				data-testid="standalone-viewer-root"
				key={`${file.name}-${file.size}-${file.lastModified}`}
				style={editorSlotStyle}
			>
				{viewer()}
			</main>
		</div>
	);
};
