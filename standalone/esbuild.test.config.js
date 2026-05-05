const esbuild = require("esbuild");
const css = require("esbuild-css-modules-plugin");
const path = require("path");

esbuild
	.build({
		entryPoints: [path.join(__dirname, "test/index.ts")],
		tsconfig: path.join(__dirname, "..", "tsconfig.json"),
		bundle: true,
		external: ["vscode", "mocha", "chai", "jsdom"],
		minify: false,
		platform: "node",
		define: { "process.env.NODE_ENV": '"test"' },
		outfile: path.join(__dirname, "..", "dist-standalone/test.js"),
		plugins: [css({ v2: true, filter: /\.css$/i })],
	})
	.catch(() => process.exit(1));
