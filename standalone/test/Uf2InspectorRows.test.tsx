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
