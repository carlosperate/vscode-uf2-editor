/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ILocalizedStrings, placeholder1 } from "./strings";

export const defaultStrings: ILocalizedStrings = {
	pasteAs: "Paste as",
	pasteMode: "Paste mode",
	replace: "Replace",
	insert: "Insert",
	bytes: "bytes",
	encodingError: "Encoding Error",
	decodedText: "Decoded Text",
	loadingUpper: "LOADING",
	loadingDotDotDot: "Loading...",
	littleEndian: "Little Endian",
	onlyHexChars: "Only hexadecimal characters (0-9 and a-f) are allowed",
	onlyHexCharsAndPlaceholders:
		"Only hexadecimal characters (0-9, a-f, and ?? placeholders) are allowed",
	toggleReplace: "Toggle Replace",
	findBytes: "Find Bytes (hex)",
	findText: "Find Text",
	regexSearch: "Regular Expression Search",
	searchInBinaryMode: "Search in Binary Mode",
	caseSensitive: "Case Sensitive",
	cancelSearch: "Cancel Search",
	previousMatch: "Previous Match",
	nextMatch: "Next Match",
	closeWidget: "Close Widget (Esc)",
	replaceAllMatches: "Replace All Matches",
	replaceSelectedMatch: "Replace Selected Match",
	resultOverflow: `More than ${placeholder1} results, click to find all`,
	resultCount: `${placeholder1} results`,
	foundNResults: `Found ${placeholder1}...`,
	noResults: "No results",
	openLargeFileWarning: "Opening this large file may cause instability.",
	openAnyways: "Open Anyways",
	readonlyWarning: "Cannot edit in read-only editor.",
	openSettings: "Open Settings",
	showDecodedText: "Show Decoded Text",
	bytesPerRow: "Bytes per row",
	close: "Close",
};
