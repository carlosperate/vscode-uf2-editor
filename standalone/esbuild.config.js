const esbuild = require("esbuild");
const css = require("esbuild-css-modules-plugin");
const fs = require("fs");
const path = require("path");

const watch = process.argv.includes("--watch");
const production = process.argv.includes("--production");
const define = {
	"process.env.NODE_ENV": production ? '"production"' : '"development"',
};
const distDir = path.join(__dirname, "..", "dist-standalone");

function ensureDistDir() {
	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir, { recursive: true });
	}
}

function copyIndexHtml() {
	ensureDistDir();
	const src = path.join(__dirname, "index.html");
	const dest = path.join(distDir, "index.html");
	fs.copyFileSync(src, dest);
}

const buildOptions = {
	entryPoints: [path.join(__dirname, "index.tsx")],
	tsconfig: path.join(__dirname, "..", "tsconfig.json"),
	bundle: true,
	format: "esm",
	platform: "browser",
	outfile: path.join(distDir, "standalone.js"),
	sourcemap: !production,
	minify: production,
	define,
	plugins: [css({ v2: true, filter: /\.css$/i })],
	loader: {
		".svg": "dataurl",
	},
};

async function build() {
	const context = await esbuild.context(buildOptions);

	const buildOnce = async () => {
		await context.rebuild();
		copyIndexHtml();
	};

	if (watch) {
		await buildOnce();
		await context.watch({
			onRebuild(error) {
				if (error) {
					console.error("Standalone build failed", error);
					return;
				}
				copyIndexHtml();
				console.log("Standalone build updated");
			},
		});
		console.log("Watching standalone viewer...");
	} else {
		await buildOnce();
		await context.dispose();
	}
}

build().catch(error => {
	console.error(error);
	process.exit(1);
});
