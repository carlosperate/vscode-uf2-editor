import { expect } from "chai";
import { parseBlock, UF2_BLOCK_SIZE } from "../../shared/uf2/block";
import { isUf2 } from "../../shared/uf2/detect";
import { parseExtensionTags, Uf2TagType } from "../../shared/uf2/extensionTags";
import { parseFileContainer } from "../../shared/uf2/fileContainer";
import { Uf2Flag, hasFlag } from "../../shared/uf2/flags";
import { parseMd5Trailer } from "../../shared/uf2/md5";
import { loadFixtureBytes } from "../../standalone/test/utils/file";

const expectOk = <T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> => {
	expect(result.ok, `parse failed: ${JSON.stringify(result)}`).to.equal(true);
	return result as Extract<T, { ok: true }>;
};

const ascii = (bytes: Uint8Array): string =>
	String.fromCharCode(...bytes).replace(/\0+$/, "");

describe("UF2 parser", () => {
	it("parses the header of a known fixture block", () => {
		const bytes = loadFixtureBytes("family_a.uf2");
		const block = expectOk(parseBlock(bytes, 0));

		expect(block.targetAddr).to.equal(0x10000000);
		expect(block.payloadSize).to.equal(256);
		expect(block.blockNo).to.equal(0);
		expect(block.numBlocks).to.equal(256);
		expect(block.fileSizeOrFamilyId).to.equal(0xaaaaaaaa);
		expect(hasFlag(block.flags, Uf2Flag.FamilyIdPresent)).to.equal(true);
		// Fixture invariant: block N's payload is a solid run of byte N.
		expect(block.payload).to.have.lengthOf(256);
		expect(block.payload.every(b => b === 0)).to.equal(true);
	});

	it("recognises every flag variant across the fixture set", () => {
		const notMain = expectOk(parseBlock(loadFixtureBytes("flag_not_main_flash.uf2"), 0));
		expect(hasFlag(notMain.flags, Uf2Flag.NotMainFlash)).to.equal(true);

		const md5Block = expectOk(parseBlock(loadFixtureBytes("flag_md5.uf2"), 0));
		expect(hasFlag(md5Block.flags, Uf2Flag.Md5Present)).to.equal(true);
		const md5 = parseMd5Trailer(md5Block);
		expect(md5).to.deep.equal({
			regionStart: 0x10000000,
			regionLength: 0x00010000,
			md5: new Uint8Array(16).fill(0xaa),
		});

		const tagsBlock = expectOk(parseBlock(loadFixtureBytes("flag_extension_tags.uf2"), 0));
		expect(hasFlag(tagsBlock.flags, Uf2Flag.ExtensionTags)).to.equal(true);
		const tags = parseExtensionTags(tagsBlock);
		const byType = new Map(tags.map(t => [t.type, ascii(t.data)]));
		expect(byType.get(Uf2TagType.Version)).to.equal("0.1.2");
		expect(byType.get(Uf2TagType.Description)).to.equal("ACME Toaster mk3");

		const fcBlock = expectOk(parseBlock(loadFixtureBytes("flag_file_container.uf2"), 0));
		expect(hasFlag(fcBlock.flags, Uf2Flag.FileContainer)).to.equal(true);
		const fc = parseFileContainer(fcBlock);
		expect(fc).to.deep.equal({
			filename: "hello.txt",
			fileSize: fcBlock.fileSizeOrFamilyId,
			offsetInFile: 0,
		});
	});

	it("rejects malformed input without throwing", () => {
		const valid = loadFixtureBytes("family_a.uf2").slice(0, UF2_BLOCK_SIZE);

		expect(parseBlock(new Uint8Array(UF2_BLOCK_SIZE - 1), 0)).to.deep.include({
			ok: false,
			reason: "too-short",
		});

		const badStart = new Uint8Array(valid);
		badStart[0] = 0x00;
		expect(parseBlock(badStart, 0)).to.deep.include({ ok: false, reason: "bad-magic-start" });

		const badEnd = new Uint8Array(valid);
		badEnd[508] = 0x00;
		expect(parseBlock(badEnd, 0)).to.deep.include({ ok: false, reason: "bad-magic-end" });

		const tooBig = new Uint8Array(valid);
		new DataView(tooBig.buffer).setUint32(16, 477, true);
		expect(parseBlock(tooBig, 0)).to.deep.include({ ok: false, reason: "invalid-payload-size" });
	});

	it("isUf2 distinguishes UF2 from random bytes", () => {
		expect(isUf2(loadFixtureBytes("family_a.uf2"))).to.equal(true);
		expect(isUf2(loadFixtureBytes("incrementing.bin"))).to.equal(false);
	});
});
