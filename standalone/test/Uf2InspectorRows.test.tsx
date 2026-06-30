import { render } from "@testing-library/react";
import { expect } from "chai";
import React from "react";
import { Uf2InspectorRows } from "../../media/editor/uf2/Uf2InspectorRows";
import { parseBlock, UF2_BLOCK_SIZE } from "../../shared/uf2/block";
import { loadFixtureBytes } from "./utils/file";

const renderRows = (children: React.ReactNode) => render(<dl>{children}</dl>);

describe("Uf2InspectorRows", () => {
	it("renders decoded fields as dt/dd pairs for a UF2 block", () => {
		const block = parseBlock(loadFixtureBytes("family_a.uf2"), 0);
		const { getByTestId } = renderRows(<Uf2InspectorRows result={block} />);

		expect(getByTestId("uf2-block-target-addr").textContent).to.equal("0x10000000");
		expect(getByTestId("uf2-block-family-id").textContent).to.equal("0xAAAAAAAA");
		// Sanity: rendered as dt/dd inside the parent <dl>, not a standalone box
		expect(getByTestId("uf2-block-target-addr").tagName).to.equal("DD");
	});

	it("shows the (0-based) block number and total as separate rows, not a fraction", () => {
		const bytes = loadFixtureBytes("family_a.uf2");
		// The last block is the one that read confusingly as "255 / 256": its
		// 0-based blockNo (255) must show distinctly from the total (256).
		const lastOffset = bytes.byteLength - UF2_BLOCK_SIZE;
		const lastBlock = parseBlock(bytes, lastOffset);
		const { getByTestId } = renderRows(<Uf2InspectorRows result={lastBlock} />);

		expect(getByTestId("uf2-block-no").textContent).to.equal("255");
		expect(getByTestId("uf2-num-blocks").textContent).to.equal("256");
	});

	it("renders an inline notice when the block fails to parse", () => {
		const { getByTestId } = renderRows(
			<Uf2InspectorRows result={{ ok: false, reason: "bad-magic-start" }} />,
		);
		expect(getByTestId("uf2-block-error").textContent).to.equal("Invalid UF2 block");
	});

	it("renders a notice for a trailing partial block without throwing", () => {
		// A file whose length is not a multiple of 512 has a trailing partial block.
		// The parser must return ok:false; the inspector must show a notice rather than throw.
		const partial = loadFixtureBytes("family_a.uf2").subarray(0, UF2_BLOCK_SIZE - 100);
		const result = parseBlock(partial, 0);
		expect(result.ok).to.equal(false);
		const { getByTestId } = renderRows(<Uf2InspectorRows result={result} />);
		expect(getByTestId("uf2-block-error").textContent).to.equal("Invalid UF2 block");
	});
});
