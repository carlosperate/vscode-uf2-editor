import Mocha from "mocha";
import "../../src/test/setupDomEnvironment";

const fileImports = [
	() => import("./BrowserFileAccessor.test"),
	() => import("./FileDropZone.test"),
	() => import("./MockMessageHandler.test"),
	() => import("./StandaloneApp.test"),
	() => import("./StandaloneDataFlow.test"),
	() => import("./vscodeApiMock.test"),
	() => import("./integration.test"),
];

async function run(): Promise<void> {
	const mocha = new Mocha({ ui: "bdd", color: true });

	for (const doImport of fileImports) {
		mocha.suite.emit(Mocha.Suite.constants.EVENT_FILE_PRE_REQUIRE, global, doImport, mocha);
		await doImport();
		mocha.suite.emit(Mocha.Suite.constants.EVENT_FILE_REQUIRE, {}, doImport, mocha);
		mocha.suite.emit(Mocha.Suite.constants.EVENT_FILE_POST_REQUIRE, global, doImport, mocha);
	}

	return new Promise((resolve, reject) => {
		mocha.run(failures => {
			if (failures > 0) {
				reject(new Error(`${failures} tests failed.`));
			} else {
				resolve();
			}
		});
	});
}

run()
	.then(() => process.exit(0))
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
