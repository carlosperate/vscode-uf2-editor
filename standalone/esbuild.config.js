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

// Added to index.html only when ADD_ANALYTICS is set (in CI).
const analyticsScripts = [
	`<script data-goatcounter="https://angc.embeddedlog.com/count" async src="//angc.embeddedlog.com/count.js"></script>`,
	`<script defer src="https://an.embeddedlog.com/script.js" data-website-id="bc1ae519-73b1-42ec-b1eb-c0ccd08d0abf"></script>`,
];

function ensureDistDir() {
	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir, { recursive: true });
	}
}

function copyIndexHtml() {
	ensureDistDir();
	const src = path.join(__dirname, "index.html");
	const dest = path.join(distDir, "index.html");
	let html = fs.readFileSync(src, "utf8");
	if (process.env.ADD_ANALYTICS) {
		const scripts = analyticsScripts.map(script => `\t\t${script}\n`).join("");
		html = html.replace("</body>", `${scripts}\t</body>`);
	}
	fs.writeFileSync(dest, html);
}

function copyStandaloneCss() {
	ensureDistDir();
	const src = path.join(__dirname, "styles", "standalone.css");
	const dest = path.join(distDir, "standalone-chrome.css");
	fs.copyFileSync(src, dest);
}

const copyPlugin = {
	name: "copy-static",
	setup(build) {
		build.onEnd(result => {
			if (result.errors.length > 0) {
				return;
			}
			copyIndexHtml();
			copyStandaloneCss();
			if (watch) {
				console.log("Standalone build updated");
			}
		});
	},
};

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
	plugins: [css({ v2: true, filter: /\.css$/i }), copyPlugin],
	loader: {
		".svg": "dataurl",
	},
};

async function build() {
	const context = await esbuild.context(buildOptions);

	if (watch) {
		await context.rebuild();
		await context.watch();
		const cssFile = path.join(__dirname, "styles", "standalone.css");
		fs.watch(cssFile, () => {
			copyStandaloneCss();
			console.log("Standalone build updated");
		});
		console.log("Watching standalone viewer...");
	} else {
		await context.rebuild();
		await context.dispose();
	}
}

build().catch(error => {
	console.error(error);
	process.exit(1);
});
