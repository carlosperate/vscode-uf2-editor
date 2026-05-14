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

type GlobalWithVsCodeApi = typeof globalThis & { acquireVsCodeApi?: () => VsCodeApi };
const globalWithVsCodeApi = globalThis as GlobalWithVsCodeApi;

/**
 * Build a `MessageEvent` using the *target's* `MessageEvent` constructor when
 * possible. In jsdom (and any iframe/window setup) the host realm's MessageEvent
 * is what its message listeners recognize; constructing one from a different
 * realm produces an event that silently fails to deliver.
 */
const createMessageEvent = (
	target: EventTarget,
	data: WebviewMessage<ToWebviewMessage>,
): MessageEvent<WebviewMessage<ToWebviewMessage>> => {
	const ctor = (target as { MessageEvent?: typeof MessageEvent }).MessageEvent ?? MessageEvent;
	return new ctor("message", { data });
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

	globalWithVsCodeApi.acquireVsCodeApi = () => api;
}

export function resetVsCodeApiMock(): void {
	storedState = undefined;
	currentHandler = undefined;
	nextMessageId = 1;
	delete globalWithVsCodeApi.acquireVsCodeApi;
}
