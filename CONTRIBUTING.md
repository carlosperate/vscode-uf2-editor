# Contributing to VS Code UF2 Editor

There are many ways to contribute to the Visual Studio Code UF2 Editor project: logging bugs, submitting pull requests, reporting issues, and creating suggestions.

After cloning and building the repo, check out the [issues list](https://github.com/carlosperate/vscode-uf2-editor/issues?q=is%3Aissue+is%3Aopen+).

### Getting the sources

First, fork the VS Code UF2 Editor repository so that you can make a pull request. Then, clone your fork locally:

```
git clone https://github.com/<<<your-github-account>>>/vscode-uf2-editor.git
```

Occasionally you will want to merge changes in the upstream repository (the official code repo) with your fork.

```
cd vscode-uf2-editor
git checkout main
git pull https://github.com/carlosperate/vscode-uf2-editor.git main
```

Manage any merge conflicts, commit them, and then push them to your fork.

## Prerequisites

In order to download necessary tools, clone the repository, and install dependencies through npm, you need network access.

You'll need the following tools:

- [Git](https://git-scm.com)
- [Node.JS](https://nodejs.org/en/), **x64**, version `>= 12.x`

```
cd vscode-uf2-editor
npm install
```

## Build and Run

After cloning the extension and running `npm install` execute `npm run watch` to initiate esbuild's file watcher and then use the debugger in VS Code to execute "Run Extension".

### Linting

We use [eslint](https://eslint.org/) for linting our sources. You can run eslint across the sources by calling `npm run lint` from a terminal or command prompt.
To lint the source as you make changes you can install the [eslint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).

## Suggestions

We're also interested in your feedback for the future of the UF2 editor. You can submit a suggestion or feature request through the issue tracker. To make this process more effective, we're asking that these include more information to help define them more clearly.

## Discussion Etiquette

In order to keep the conversation clear and transparent, please limit discussion to English and keep things on topic with the issue. Be considerate to others and try to be courteous and professional at all times.
