import React, { Suspense, useLayoutEffect, useMemo } from "react";
import { RecoilRoot, useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { DataHeader } from "./dataDisplay";
import { DataDisplayContext, DisplayContext } from "./dataDisplayContext";
import { FindWidget } from "./findWidget";
import _style from "./hexEdit.css";
import { useTheme } from "./hooks";
import { ReadonlyWarning } from "./readonlyWarning";
import { ScrollContainer } from "./scrollContainer";
import { SettingsGear } from "./settings";
import * as select from "./state";
import { strings } from "./strings";
import { throwOnUndefinedAccessInDev } from "./util";
import { VsProgressIndicator } from "./vscodeUi";

const style = throwOnUndefinedAccessInDev(_style);

export const EditorRoot: React.FC = () => {
	const setDimensions = useSetRecoilState(select.dimensions);
	const theme = useTheme();

	useLayoutEffect(() => {
		const fallbackFontSize = (value: string | undefined): number => {
			const parsed = Number.parseInt(value ?? "", 10);
			return Number.isFinite(parsed) ? parsed : 14;
		};

		const applyDimensions = () =>
			setDimensions({
				width: window.innerWidth,
				height: window.innerHeight,
				rowPxHeight: fallbackFontSize(theme["editor-font-size"]) + 8,
			});

		window.addEventListener("resize", applyDimensions);
		applyDimensions();
		return () => window.removeEventListener("resize", applyDimensions);
	}, [theme]);

	return (
		<Suspense fallback={<VsProgressIndicator />}>
			<Editor />
		</Suspense>
	);
};

const Editor: React.FC = () => {
	const dimensions = useRecoilValue(select.dimensions);
	const setEdit = useSetRecoilState(select.edits);
	const isReadonly = useRecoilValue(select.isReadonly);
	const ctx = useMemo(() => new DisplayContext(setEdit, isReadonly), []);

	const isLargeFile = useRecoilValue(select.isLargeFile);
	const [bypassLargeFilePrompt, setBypassLargeFile] = useRecoilState(select.bypassLargeFilePrompt);

	if (isLargeFile && !bypassLargeFilePrompt) {
		return (
			<div>
				<p>
					{strings.openLargeFileWarning}{" "}
					<a id="open-anyway" role="button" onClick={() => setBypassLargeFile(true)}>
						{strings.openAnyways}
					</a>
				</p>
			</div>
		);
	}

	return (
		<DataDisplayContext.Provider value={ctx}>
			<div
				className={style.container}
				style={{ "--cell-size": `${dimensions.rowPxHeight}px` } as React.CSSProperties}
			>
				<FindWidget />
				<SettingsGear />
				<DataHeader />
				<ScrollContainer />
				<ReadonlyWarning />
			</div>
		</DataDisplayContext.Provider>
	);
};

export const StandaloneEditor: React.FC = () => (
	<RecoilRoot>
		<EditorRoot />
	</RecoilRoot>
);
