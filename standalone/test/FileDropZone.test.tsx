import { fireEvent, render } from "@testing-library/react";
import { expect } from "chai";
import React from "react";
import { FileDropZone } from "../components/FileDropZone";
import { createTestFile } from "./utils/file";

const createMockFileList = (files: File[]): FileList => {
	const list: Record<number, File> & {
		length: number;
		item(index: number): File | null;
		[Symbol.iterator](): IterableIterator<File>;
	} = {
		length: files.length,
		item: (index: number) => files[index] ?? null,
		[Symbol.iterator]: function* () {
			for (const file of files) {
				yield file;
			}
		},
	};
	files.forEach((file, index) => {
		list[index] = file;
	});
	return list as unknown as FileList;
};

const createMockDataTransfer = (...files: File[]): DataTransfer =>
	({
		dropEffect: "none",
		effectAllowed: "all",
		files: createMockFileList(files),
		items: [] as unknown as DataTransferItemList,
		types: [],
		clearData: () => undefined,
		getData: () => "",
		setData: () => false,
		setDragImage: () => undefined,
	}) as unknown as DataTransfer;

describe("FileDropZone", () => {
	it("renders the default heading and description", () => {
		const { getByRole, getByText } = render(<FileDropZone onFileSelect={() => {}} />);
		expect(getByRole("heading", { level: 1 }).textContent).to.match(/UF2/);
		expect(getByText(/Drop a file here/)).to.exist;
	});

	it("calls onFileSelect when a file is chosen via the input", () => {
		let selected: File | null = null;
		const file = createTestFile([0, 1, 2], "input.uf2");
		const { getByLabelText } = render(
			<FileDropZone onFileSelect={fileArg => (selected = fileArg)} />,
		);

		const input = getByLabelText(/Select file/i) as HTMLInputElement;
		fireEvent.change(input, { target: { files: [file] } });

		expect(selected).to.equal(file);
	});

	it("handles dragged-and-dropped files", () => {
		let dropped: File | null = null;
		const file = createTestFile([3, 4, 5], "drop.uf2");
		const { getByTestId } = render(<FileDropZone onFileSelect={fileArg => (dropped = fileArg)} />);

		const zone = getByTestId("file-dropzone");
		fireEvent.dragOver(zone);
		fireEvent.drop(zone, {
			dataTransfer: createMockDataTransfer(file),
		});

		expect(dropped).to.equal(file);
	});
});
