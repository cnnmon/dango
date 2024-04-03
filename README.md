# dango 🍡

**dango** is a vscode extension meant to act as an intelligent co-collaborator on your creative programming projects. we can ofc change the name but i thought it'd be a cute filler name for the time being.

## getting started
see: [the entire "getting started" section](https://code.visualstudio.com/api/get-started/your-first-extension) from the vscode extension api docs

learn what commands are, activation, deactivation.

### the language is typescript

i chose to build it in **typescript**, which is a strongly typed version of javascript. this means we must include explicit types on any parameters passed into to functions.

for example, javascript might say `function myFunction(catName)` and typescript `function myFunction(catName: string)`. then, any usage of `myFunction` with a `catName` that isn't a string will error. this is to ensure our repo stays readable!

### important files

```
- DANGO
  - .vscode
  - node_modules
  - src
    - test
      - extension.test.ts
    - extension.ts
    - utils.ts
  - .eslintrc.json
  - .gitignore
  - .vscodeignore
  - CHANGELOG.md
  - package-lock.json
  - package.json
  - README.md
  - tsconfig.json
  - vscode-extension-quickstart.md
```

inside **src** is the bulk of the code we will modify:

- **extension.ts** is the base of operations; it's where we define new commands (e.g. "Dango: View Files") and the corresponding code it runs (e.g. actually viewing the files in the codebase). note that when we add new commands, we need to also add them to **package.json**.
- **utils.ts** is a file for helper functions i made to simplify extension.ts. we import from utils.ts into extension.ts.
- **extension.test.ts** came with the automatic setup, so we can use it for testing at some point or delete it.

### previewing & debugging

to run the code, hit **run > start debugging** or f5. this should bring up a second vscode window which should have the extension "installed". in the second window, hit **ctrl + shift + p** to open the "command palette" where you can search for extensions. you should be able to type "dango" to find the currently implemented commands.

me testing "view files" and "add file":

https://github.com/cnnmon/dango/assets/20329981/fab43136-1579-4e3f-9796-3f304d329ce2
