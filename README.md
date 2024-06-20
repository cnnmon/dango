## What is Dango? 

Dango is a VS Code extension enabling user and AI to collaborate on a "living design doc". Using this and awareness of codebase, Dango enables effective and context-aware code generations so that you can experiment and build more easily.

Dango can create and modify the codebase, modify the design doc, ask for clarifications, and more.

![Gyazo screenshot](https://github.com/cnnmon/dango/assets/20329981/b3983ac8-7ab0-4310-b7b4-80d2be101231)

## How do I access it?

Simply run ⇧⌘P to bring up the Command Palette. Then, type Dango to find commands; `Dango: Find` should open the webview.

Note that closing the webview

<img width="775" alt="image" src="https://github.com/cnnmon/dango/assets/20329981/f6812b20-49f4-4358-84c2-8450ba2b8f69">

## How do I use Dango?

Ensure that Dango is open at the root of your project's repostiory. Then, ensure you have a `design.md` file at root. It should look something like this, though the more information the better:

```
# Objective
I want to make a p5.js animation with a sun and moon.

[...you can use any other headers but you must have at least a "Steps" section]

# Steps
## 1. Setup p5.js
## 2. Create the sun
## 3. Create the moon
## 4. Create the movement
```

Steps should be small enough such that they encompass at maximum one full file.

Once Dango locates the design doc with the proper steps, it will allow you to navigate through them. At each step, you can choose to have Dango work on it. It will either (1) generate/modify a file directly to implement it, (2) add notes to the design doc if code generation is not possible, or (3) ask clarifying questions in which you need to add more information to the step.
