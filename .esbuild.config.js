const esbuild = require("esbuild");
const svgr = require("esbuild-plugin-svgr");
const css = require("esbuild-css-modules-plugin");
const fs = require("fs");
const path = require("path");

const watch = process.argv.includes("--watch");
const minify = !watch || process.argv.includes("--minify");
const defineProd = process.argv.includes("--defineProd");

// Copy assets (manually maintained files) to dist-extension after build
function copyAssets() {
	const assetsDir = path.join(__dirname, "assets");
	const distDir = path.join(__dirname, "dist-extension");

	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir, { recursive: true });
	}

	if (!fs.existsSync(assetsDir)) {
		return;
	}

	const files = fs.readdirSync(assetsDir);
	for (const file of files) {
		const src = path.join(assetsDir, file);
		const dest = path.join(distDir, file);
		fs.copyFileSync(src, dest);
	}

	if (files.length > 0) {
		console.log(`Copied ${files.length} asset(s) to dist-extension/`);
	}
}

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
	outfile: "dist-extension/extension.js",
});

// Build the test cases
build({
	entryPoints: ["src/test/index.ts"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	external: ["vscode", "mocha", "chai"],
	sourcemap: watch,
	minify,
	platform: "node",
	outfile: "dist-extension/test.js",
});

build({
	entryPoints: ["src/extension.ts"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	format: "cjs",
	external: ["vscode", "fs", "worker_threads"],
	minify,
	platform: "browser",
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
	outfile: "dist-extension/diffWorker.js",
});

// Build the webview editors
build({
	entryPoints: ["media/editor/hexEdit.tsx"],
	tsconfig: "./tsconfig.json",
	bundle: true,
	external: ["vscode"],
	sourcemap: watch,
	minify,
	platform: "browser",
	outfile: "dist-extension/editor.js",
	define: defineProd
		? {
				"process.env.NODE_ENV": defineProd ? '"production"' : '"development"',
			}
		: undefined,
	plugins: [svgr(), css({ v2: true, filter: /\.css$/i })],
});

// Copy assets after build completes
setTimeout(() => copyAssets(), 100);
