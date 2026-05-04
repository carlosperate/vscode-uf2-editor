import React from "react";
import { createRoot } from "react-dom/client";
import { defaultStrings } from "../shared/defaultStrings";
import { ILocalizedStrings } from "../shared/strings";
import { StandaloneApp } from "./StandaloneApp";
import "./styles/theme.css";

declare global {
	// eslint-disable-next-line no-var
	var LOC_STRINGS: ILocalizedStrings | undefined;
}

if (!globalThis.LOC_STRINGS) {
	globalThis.LOC_STRINGS = defaultStrings;
}

const container = document.getElementById("root");

if (!container) {
	throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<StandaloneApp />);
