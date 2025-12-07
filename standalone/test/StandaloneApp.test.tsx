import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import React from "react";
import { StandaloneApp } from "../StandaloneApp";
import { createTestFile } from "./utils/file";

describe("StandaloneApp", () => {
	it("shows the drop zone before a file is selected", () => {
		const { getByTestId } = render(<StandaloneApp />);
		expect(getByTestId("file-dropzone")).to.exist;
	});

	it("initializes messaging and renders the viewer once a file is selected", () => {
		let initialized: File | null = null;
		const file = createTestFile([9, 9, 9], "selected.uf2");

		const { getByLabelText, queryByTestId, getByTestId } = render(
			<StandaloneApp
				initializeMessaging={fileArg => {
					initialized = fileArg;
				}}
				renderViewer={() => <div data-testid="viewer-stub">Viewer</div>}
			/>,
		);

		const input = getByLabelText(/Select file/i) as HTMLInputElement;
		fireEvent.change(input, { target: { files: [file] } });

		expect(initialized).to.equal(file);
		expect(queryByTestId("file-dropzone")).to.be.null;
		expect(getByTestId("viewer-stub")).to.exist;
	});
});
