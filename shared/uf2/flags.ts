export enum Uf2Flag {
	NotMainFlash = 0x00000001,
	FileContainer = 0x00001000,
	FamilyIdPresent = 0x00002000,
	Md5Present = 0x00004000,
	ExtensionTags = 0x00008000,
}

export const hasFlag = (flags: number, flag: Uf2Flag): boolean => (flags & flag) === flag;
