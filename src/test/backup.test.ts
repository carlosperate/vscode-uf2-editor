/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { expect } from "chai";
import { Uf2DocumentEdit, Uf2DocumentEditOp } from "../../shared/uf2DocumentModel";
import { Backup } from "../backup";
import { getTempFile } from "./util";

describe("Backup", () => {
	const edits: Uf2DocumentEdit[] = [
		{ op: Uf2DocumentEditOp.Delete, offset: 3, previous: new Uint8Array([3, 4, 5]) },
		{
			op: Uf2DocumentEditOp.Replace,
			offset: 1,
			value: new Uint8Array([10, 11, 12]),
			previous: new Uint8Array([1, 2, 6]),
		},
	];

	it("round trips", async () => {
		const backup = new Backup(await getTempFile());
		await backup.write(edits);
		expect(await backup.read()).to.deep.equal(edits);
	});
});
