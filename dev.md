# Developer Docs

1. Install dependencies: `npm install`
2. Start the watch build: `npm run watch`
3. Press <kbd>F5</kbd> in VS Code to launch the **Run Extension** debug configuration — this opens a new Extension Development Host window with the extension loaded.

To run the tests: `npm test`

## Standalone Web Viewer

A browser-based version of the viewer is available on the `standalone` folder. It reuses the same editor UI without requiring VS Code.

```bash
npm run build:standalone   # production build → dist-standalone/
npm run watch:standalone   # rebuild on file changes
npx serve dist-standalone  # serve locally
```

The `dist-standalone/` output can be deployed to any static host (GitHub Pages, Netlify, etc.).

## Making a Release

1. Update the version number in `package.json` and `CHANGELOG.md` following semantic versioning.
2. Create a GitHub release.
3. The CI will automatically publish the new version to the VS Code Marketplace and update the web viewer demo.
   - Token for the Marketplace is stored in GitHub secrets and expires periodically.
   - To create a new token, make it accessible to all organisation, and add only the "Marketplace (Manage)" scope.
