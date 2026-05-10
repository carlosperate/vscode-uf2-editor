const esbuild = require("esbuild");
const css = require("esbuild-css-modules-plugin");

const watch = process.argv.includes("--watch");
const minify = !watch || process.argv.includes("--minify");
const envDefine = {
	"process.env.NODE_ENV": watch ? '"development"' : '"production"',
};
const testDefine = {
	"process.env.NODE_ENV": '"test"',
};

function build(options) {
	(async () => {
		if (watch) {
			const context = await esbuild.context(options);
			await context.watch();
		} else {
			await esbuild.build(options);
		}
	})().catch(() => process.exit(1));
}

// Build the editor provider
build({
	entryPoints: ["src/extension.ts"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	external: ["vscode"],
	sourcemap: watch,
	minify,
	platform: "node",
	define: envDefine,
	outfile: "dist-extension/extension.js",
});

// Build the test cases
build({
	entryPoints: ["src/test/index.ts"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	external: ["vscode", "mocha", "chai", "jsdom"],
	sourcemap: watch,
	minify: false,
	platform: "node",
	define: testDefine,
	outfile: "dist-extension/test.js",
	plugins: [css({ v2: true, filter: /\.css$/i })],
});

build({
	entryPoints: ["src/extension.ts"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	format: "cjs",
	external: ["vscode", "fs", "worker_threads"],
	minify,
	platform: "browser",
	define: envDefine,
	outfile: "dist-extension/web/extension.js",
});

build({
	entryPoints: ["shared/diffWorker.ts"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	format: "cjs",
	external: ["vscode", "worker_threads"],
	minify,
	platform: "browser",
	define: envDefine,
	outfile: "dist-extension/diffWorker.js",
});

// Build the webview editors

const editorBuildOptions = {
	entryPoints: ["media/editor/hexEdit.tsx"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	external: ["vscode"],
	sourcemap: watch,
	minify,
	platform: "browser",
	outfile: "dist-extension/editor.js",
	define: envDefine,
	plugins: [css({ v2: true, filter: /\.css$/i })],
};

build(editorBuildOptions);
