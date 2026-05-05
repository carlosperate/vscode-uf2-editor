import { selector, selectorFamily } from "recoil";
import { parseBlock, UF2_BLOCK_SIZE, Uf2ParseResult } from "../../../shared/uf2/block";
import { isUf2 } from "../../../shared/uf2/detect";
import * as state from "../state";

const firstBlockBytes = selector<Uint8Array>({
	key: "uf2/firstBlockBytes",
	get: async ({ get }) => {
		const page = await get(state.editedDataPages(0));
		return page.subarray(0, Math.min(UF2_BLOCK_SIZE, page.byteLength));
	},
});

export const isUf2FileSelector = selector<boolean>({
	key: "uf2/isUf2",
	get: ({ get }) => isUf2(get(firstBlockBytes)),
});

/**
 * Parses the 512-byte block containing the given byte offset. Bounded by
 * file size; values are LRU-capped so scrolling through a large UF2 doesn't
 * grow memory unboundedly.
 */
export const blockAtOffset = selectorFamily<Uf2ParseResult, number>({
	key: "uf2/blockAtOffset",
	get:
		(byteOffset: number) =>
		async ({ get }) => {
			const blockOffset = Math.floor(byteOffset / UF2_BLOCK_SIZE) * UF2_BLOCK_SIZE;
			const pageSize = get(state.dataPageSize);
			const pageNumber = Math.floor(blockOffset / pageSize);
			const offsetInPage = blockOffset - pageNumber * pageSize;
			const page = await get(state.editedDataPages(pageNumber));
			return parseBlock(page, offsetInPage);
		},
	cachePolicy_UNSTABLE: { eviction: "lru", maxSize: 64 },
});
