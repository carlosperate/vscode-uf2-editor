import { FromWebviewMessage, ToWebviewMessage, WebviewMessage } from "../shared/protocol";
import { MockMessageHandler } from "./MockMessageHandler";

export interface InitializeVsCodeApiOptions {
	/**
	 * Custom event target used to dispatch MessageEvents. Defaults to `window`
	 * when available, or a shared EventTarget fallback in non-browser tests.
	 */
	eventTarget?: EventTarget;
}

interface VsCodeApi {
	postMessage(message: WebviewMessage<FromWebviewMessage>): Promise<void>;
	getState(): unknown;
	setState(state: unknown): void;
}

const fallbackTarget = typeof window !== "undefined" ? window : new EventTarget();

const createMessageEvent = (
	target: EventTarget,
	data: WebviewMessage<ToWebviewMessage>,
): MessageEvent<WebviewMessage<ToWebviewMessage>> => {
	const targetWithCtor = target as Window & typeof globalThis;
	const ctor =
		typeof targetWithCtor.MessageEvent === "function"
			? targetWithCtor.MessageEvent
			: typeof globalThis.MessageEvent === "function"
				? globalThis.MessageEvent
				: undefined;

	if (ctor) {
		return new ctor("message", { data });
	}

	const fallback = new Event("message") as MessageEvent<WebviewMessage<ToWebviewMessage>>;
	Object.defineProperty(fallback, "data", { value: data, writable: false });
	return fallback;
};

let storedState: unknown;
let currentHandler: MockMessageHandler | undefined;
let nextMessageId = 1;

export function initializeVsCodeApi(
	handler: MockMessageHandler,
	options: InitializeVsCodeApiOptions = {},
): void {
	currentHandler = handler;
	nextMessageId = 1;
	const target = options.eventTarget ?? fallbackTarget;
	const api: VsCodeApi = {
		async postMessage(message: WebviewMessage<FromWebviewMessage>): Promise<void> {
			if (!currentHandler) {
				throw new Error("MockMessageHandler has not been initialized");
			}

			const response = await currentHandler.handleMessage(message.body);
			if (response) {
				const envelope: WebviewMessage<ToWebviewMessage> = {
					body: response,
					inReplyTo: message.messageId,
					messageId: nextMessageId++,
				};
				target.dispatchEvent(createMessageEvent(target, envelope));
			}
		},
		getState: () => storedState,
		setState: state => {
			storedState = state;
		},
	};

	(globalThis as { acquireVsCodeApi?: () => VsCodeApi }).acquireVsCodeApi = () => api;
}

export function resetVsCodeApiMock(): void {
	storedState = undefined;
	currentHandler = undefined;
	nextMessageId = 1;
	delete (globalThis as { acquireVsCodeApi?: () => VsCodeApi }).acquireVsCodeApi;
}
