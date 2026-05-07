import { fireEvent, render, waitFor } from "@testing-library/react";
import { expect } from "chai";
import React, { Suspense } from "react";
import { RecoilRoot, useRecoilValue } from "recoil";
import * as select from "../../media/editor/state";
import { StandaloneApp } from "../StandaloneApp";
import { createTestFile } from "./utils/file";

const DataProbe: React.FC = () => {
	const fileSize = useRecoilValue(select.fileSize);
	const page = useRecoilValue(select.editedDataPages(0));

	return (
		<div>
			<div data-testid="file-size">{fileSize}</div>
			<div data-testid="page-bytes">{Array.from(page).join(",")}</div>
		</div>
	);
};

const renderViewer = () => (
	<RecoilRoot>
		<Suspense fallback={<div data-testid="loading" />}>
			<DataProbe />
		</Suspense>
	</RecoilRoot>
);

describe("Standalone data flow", () => {
	it("loads and renders bytes after file selection", async () => {
		const file = createTestFile([0x11, 0x22, 0x33, 0x44], "bytes.uf2");
		const { getByLabelText, getByTestId, queryByTestId } = render(
			<StandaloneApp renderViewer={renderViewer} />,
		);

		const input = getByLabelText(/select file/i) as HTMLInputElement;
		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => expect(queryByTestId("file-dropzone")).to.be.null);
		await waitFor(() => expect(getByTestId("file-size").textContent).to.equal("4"));
		await waitFor(() => expect(getByTestId("page-bytes").textContent).to.equal("17,34,51,68"));
	});

	it("refreshes the displayed data after switching to another file", async () => {
		const fileA = createTestFile([0x11, 0x22, 0x33, 0x44], "a.uf2");
		const fileB = createTestFile([0xaa, 0xbb, 0xcc, 0xdd, 0xee], "b.uf2");

		const { getByLabelText, getByRole, getByTestId, queryByTestId } = render(
			<StandaloneApp renderViewer={renderViewer} />,
		);

		fireEvent.change(getByLabelText(/select file/i) as HTMLInputElement, {
			target: { files: [fileA] },
		});
		await waitFor(() => expect(getByTestId("file-size").textContent).to.equal("4"));
		await waitFor(() => expect(getByTestId("page-bytes").textContent).to.equal("17,34,51,68"));

		fireEvent.click(getByRole("button", { name: /choose another file/i }));
		await waitFor(() => expect(queryByTestId("file-dropzone")).to.exist);

		fireEvent.change(getByLabelText(/select file/i) as HTMLInputElement, {
			target: { files: [fileB] },
		});

		await waitFor(() => expect(queryByTestId("file-dropzone")).to.be.null);
		await waitFor(() => expect(getByTestId("file-size").textContent).to.equal("5"));
		await waitFor(() =>
			expect(getByTestId("page-bytes").textContent).to.equal("170,187,204,221,238"),
		);
	});
});
