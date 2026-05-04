/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { defaultStrings } from "../../shared/defaultStrings";
import { ILocalizedStrings } from "../../shared/strings";

type LocStringsGlobal = typeof globalThis & { LOC_STRINGS?: ILocalizedStrings };

const stringsGlobal = globalThis as LocStringsGlobal;

if (!stringsGlobal.LOC_STRINGS) {
	stringsGlobal.LOC_STRINGS = defaultStrings;
}

export const strings = stringsGlobal.LOC_STRINGS;
