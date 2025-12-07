import { JSDOM } from "jsdom";
import { defaultStrings } from "../../shared/defaultStrings";
import { ILocalizedStrings } from "../../shared/strings";

const hasWindow = typeof (globalThis as { window?: Window }).window !== "undefined";

if (!hasWindow) {
	const dom = new JSDOM("<!doctype html><html><body></body></html>", {
		url: "http://localhost",
		pretendToBeVisual: true,
	});

	const { window } = dom;

	const getGlobal = () => globalThis as Record<string, unknown>;
	const getWindowRecord = () => window as Record<string, unknown>;
	const propagateToGlobal = (property: string) => {
		if (getGlobal()[property] === undefined && getWindowRecord()[property] !== undefined) {
			getGlobal()[property] = getWindowRecord()[property];
		}
	};

	const setGlobalProperty = (property: string, value: unknown): boolean => {
		const descriptor = Object.getOwnPropertyDescriptor(globalThis, property);
		if (!descriptor || descriptor.writable || descriptor.set) {
			getGlobal()[property] = value as unknown as Record<string, unknown>[string];
			return true;
		}
		if (descriptor.configurable) {
			Object.defineProperty(globalThis, property, {
				value,
				configurable: true,
				writable: true,
			});
			return true;
		}
		return false;
	};

	setGlobalProperty("window", window);
	setGlobalProperty("document", window.document);
	if (!setGlobalProperty("navigator", window.navigator)) {
		const existingNavigator = (globalThis as { navigator?: Navigator }).navigator;
		if (existingNavigator) {
			Object.assign(existingNavigator, window.navigator);
		}
	}

	const essentialProps: string[] = [
		"HTMLElement",
		"HTMLInputElement",
		"MutationObserver",
		"Node",
		"DOMTokenList",
	];
	essentialProps.forEach(prop => propagateToGlobal(prop));

	if (!window.matchMedia) {
		window.matchMedia = () => ({
			matches: false,
			media: "",
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
			onchange: null,
		});
	}

	propagateToGlobal("matchMedia");

	Object.getOwnPropertyNames(window).forEach(prop => propagateToGlobal(prop));
}

type LocStringsGlobal = typeof globalThis & { LOC_STRINGS?: ILocalizedStrings };

const stringsGlobal = globalThis as LocStringsGlobal;
if (!stringsGlobal.LOC_STRINGS) {
	stringsGlobal.LOC_STRINGS = defaultStrings;
}
