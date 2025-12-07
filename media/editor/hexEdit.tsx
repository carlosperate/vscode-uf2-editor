// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import React from "react";
import { render } from "react-dom";
import { RecoilRoot } from "recoil";
import { EditorRoot } from "./EditorRoot";

render(
	<RecoilRoot>
		<EditorRoot />
	</RecoilRoot>,
	document.body,
);
