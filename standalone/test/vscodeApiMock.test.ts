import { expect } from "chai";
import {
	FromWebviewMessage,
	MessageType,
	ToWebviewMessage,
	WebviewMessage,
} from "../../shared/protocol";
import { BrowserFileAccessor } from "../BrowserFileAccessor";
import { MockMessageHandler } from "../MockMessageHandler";
import { initializeVsCodeApi, resetVsCodeApiMock } from "../vscodeApiMock";
import { createTestFile } from "./utils/file";

type VsCodeApiShape = {
	postMessage(message: WebviewMessage<FromWebviewMessage>): Promise<void>;
	getState(): unknown;
	setState(state: unknown): void;
};

type AcquireVsCodeApiGlobal = typeof globalThis & {
	acquireVsCodeApi?: () => VsCodeApiShape;
};

const getVsCodeApi = () => {
	const acquire = (globalThis as AcquireVsCodeApiGlobal).acquireVsCodeApi;
	if (!acquire) {
		throw new Error("acquireVsCodeApi not initialized - did you call initializeVsCodeApi?");
	}
	return acquire();
};

const createMessage = <T extends FromWebviewMessage>(
	body: T,
	messageId = 1,
): WebviewMessage<T> => ({
	body,
	messageId,
});

describe("vscodeApiMock", () => {
	afterEach(() => {
		resetVsCodeApiMock();
	});

	const createApi = () => {
		const handler = new MockMessageHandler(new BrowserFileAccessor(createTestFile([0, 1, 2, 3])));
		const eventTarget = new EventTarget();
		const messages: MessageEvent<WebviewMessage<ToWebviewMessage>>[] = [];
		eventTarget.addEventListener("message", (event: Event) => {
			messages.push(event as MessageEvent<WebviewMessage<ToWebviewMessage>>);
		});

		initializeVsCodeApi(handler, { eventTarget });
		const api = getVsCodeApi();
		return { api, messages };
	};

	it("routes postMessage calls through the handler and emits message events", async () => {
		const { api, messages } = createApi();
		const readyRequest = createMessage({ type: MessageType.ReadyRequest });

		expect(messages).to.have.length(0);
		await api.postMessage(readyRequest);
		expect(messages).to.have.length(1);
		expect(messages[0].data.body.type).to.equal(MessageType.ReadyResponse);
		expect(messages[0].data.inReplyTo).to.equal(readyRequest.messageId);
	});

	it("persists state across multiple acquireVsCodeApi calls", () => {
		const { api } = createApi();
		expect(api.getState()).to.be.undefined;

		const snapshot = { theme: "dark" };
		api.setState(snapshot);

		const secondApi = getVsCodeApi();
		expect(secondApi.getState()).to.deep.equal(snapshot);
	});
});
