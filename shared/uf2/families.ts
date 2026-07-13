import uf2FamiliesJson from "../../uf2/utils/uf2families.json";

export interface Uf2Family {
	readonly shortName: string;
	readonly description: string;
}

/**
 * Known UF2 family IDs, sourced from uf2/utils/uf2families.json in the
 * microsoft/uf2 submodule (esbuild inlines the JSON at build time).
 * Keyed by numeric ID since the JSON hex strings vary in case.
 */
const familiesById = new Map<number, Uf2Family>(
	uf2FamiliesJson.map(f => [
		parseInt(f.id, 16),
		{ shortName: f.short_name, description: f.description },
	]),
);

export const getUf2Family = (familyId: number): Uf2Family | undefined =>
	familiesById.get(familyId);
