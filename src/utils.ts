import * as vscode from 'vscode';
const EXECUTE_PHRASE = "GO";

export type Step = {
  number: number;
  description: string;
  information: string;
}

export type Message = {
  role: string;
  content: string;
}

type File = {
  name: string;
  content: string;
}

export const templateDesignDoc = `# Objective
Develop a digital piano application with distinct soundboard-type audio for each key.

# Technologies
Next.js, Tone.js, Tailwind

# Notes
Modify this design doc however you'd like to fit your project's needs!
`;

const getInitialPrompt = (designDoc: string, { description, information }: Step) => `
  You are a pair programmer whose job is to generate code given a 'living design document', which you will update as you receive information by chatting with the project's owner.\n\n

  It is important to follow the current state of the 'living design doc':\n${designDoc}\n\n

  You are currently on step ${description}.\n
  ${information && `Additional information:\n${information}`}\n

  If the user asks for help, tell them your interface allows for the following command:\n
  Type ${EXECUTE_PHRASE} and Dango will read the design doc and either ask questions to clarify the step, generate code, or add implementation recommendations to the design doc.

  If the user wants to reset the design doc or step, they can click off the current tab and back to reset the memory of the design doc.\n\n

  These commands should be automatically detected and handled. If the user deviates from these commands, you can remind them of the available commands.\n\n
`;

async function findDesignDoc(outputChannel: vscode.OutputChannel) {
  // Find the design document
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    outputChannel.appendLine('No workspace folder found.');
    return null;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath;
  const designDocPath = `${workspacePath}/design.md`;
  const designDocUri = vscode.Uri.file(designDocPath);
  const designDocExists = await vscode.workspace.fs.stat(designDocUri).then(
    () => true,
    () => false
  );

  // Design document not found
  if (!designDocExists) {
    outputChannel.appendLine('Design document not found.');
    return null;
  }

  // Found design doc!
  outputChannel.appendLine('Design document found!');
  const designDocContent = await vscode.workspace.fs.readFile(designDocUri);
  const textDecoder = new TextDecoder();
  let content = textDecoder.decode(designDocContent);
  return { content, uri: designDocUri };
}

// Find the design document in the current root workspace
// Automatically update the files section with the current file hierarchy
async function readDesignDoc() {
  const outputChannel = vscode.window.createOutputChannel('Read Design Doc');
  outputChannel.clear();
  outputChannel.show(true);

  const designDoc = await findDesignDoc(outputChannel);
  if (!designDoc)
    return {
      success: false,
      content: '',
    };

  const { content } = designDoc;
  return {
    success: true,
    content: content,
  };
}

// Creates a new file in the current working directory
async function addFile(fileName: string, rawContent: string) {
  const outputChannel = vscode.window.createOutputChannel('Add File');
  outputChannel.clear();
  outputChannel.show(true);

  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      outputChannel.appendLine('No workspace folder found.');
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath; // Get the first workspace folder
    const filePath = `${workspacePath}/${fileName}`;
    const fileUri = vscode.Uri.file(filePath);

    // Replace the file if it already exists
    const fileExists = await vscode.workspace.fs.stat(fileUri).then(
      () => true,
      () => false
    );
    if (fileExists) {
      await vscode.workspace.fs.delete(fileUri);
    }

    // Convert the defaultContent string to a Uint8Array
    const textEncoder = new TextEncoder(); // TextEncoder is a global object
    const content = textEncoder.encode(rawContent);

    await vscode.workspace.fs.writeFile(fileUri, content);
    outputChannel.appendLine(`File ${fileName} created with default content.`);

    // Focus the new file in the editor
    const document = await vscode.workspace.openTextDocument(fileUri);
    await vscode.window.showTextDocument(document);
  } catch (error) {
    outputChannel.appendLine(`Error creating file: ${error}`);
  }

  outputChannel.appendLine('Add File complete!');
}

// With a new step object, update the design document
// Not built to delete any steps; we expect users to delete steps themselves if they want to
async function updateDesignDoc(steps: Step[]) {
  const outputChannel = vscode.window.createOutputChannel('Update Design Doc');
  outputChannel.clear();
  outputChannel.show(true);

  const designDoc = await findDesignDoc(outputChannel);
  if (!designDoc) {
    outputChannel.appendLine('No design document found.');
    return;
  }

  const { content, uri: designDocUri } = designDoc;

  try {
    const sections = content.split('\n').map(section => section.trim());
    let updatedText = [];
    let inStepsSection = false;
    let currentStepNumber = 0;
    
    // Deep copy the steps array
    const updatedSteps = steps.map(step => ({ ...step }));
    let currentUpdatedStep = updatedSteps.shift();
    
    function addStepText(step) {
      updatedText.push(`\n## ${step.number}. ${step.description}`);
      updatedText.push(step.information);
    }
    
    sections.forEach((section) => {
      if (inStepsSection) {
        if (!currentUpdatedStep) { // New step but no updated steps anymore
          inStepsSection = false;
          return;
        } else if (section.startsWith('##')) { // New step
          currentStepNumber += 1;
          if (currentStepNumber === currentUpdatedStep.number) { // If a match, replace the description
            addStepText(currentUpdatedStep);
            currentUpdatedStep = updatedSteps.shift();
            return;
          }
        } else if (section.startsWith('#')) { // New section -- we are about to leave this section!
          while (currentUpdatedStep) {
            addStepText(currentUpdatedStep);
            currentUpdatedStep = updatedSteps.shift();
          }
        } else {
          return; // Skip other lines (not important probably)
        }
      }
    
      if (section.startsWith('# Steps')) {
        inStepsSection = true;
      }
    
      updatedText.push(section);
    });
    
    // Dump steps at the bottom if no existing # Steps section
    if (currentUpdatedStep) {
      updatedText.push('\n# Steps');
    
      // Get any remaining steps if another section doesn't exist
      while (currentUpdatedStep) {
        addStepText(currentUpdatedStep);
        currentUpdatedStep = updatedSteps.shift();
      }
    }    

    const newContent = updatedText.join('\n');
    outputChannel.appendLine(`\nNew content preview:\n${newContent}\n`);

    // Write the updated content back to the design document
    const textEncoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(
      designDocUri,
      textEncoder.encode(newContent)
    );
    outputChannel.appendLine('Design document updated successfully.');

    return newContent;
  } catch (error) {
    outputChannel.appendLine(`Error updating design document: ${error}`);
    return null;
  }
}

// Return a list of names and contents of all files in the workspace
async function readAllFiles() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath; // Get the first workspace folder
  const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(workspacePath));

  // Create list fileContents that iterates over files and creates an object for each containing name and content
  let fileContents = [];
  for (const [name] of files) {
    //Exclude hidden files
    if (name.startsWith(".")) continue;
    
    const fileUri = vscode.Uri.file(`${workspacePath}/${name}`);
    const fileContentBuffer = await vscode.workspace.fs.readFile(fileUri);
    const fileContent = new TextDecoder().decode(fileContentBuffer); // Convert buffer to string
    fileContents.push({ name, content: fileContent });
  }

  return fileContents;
}

// Returns the file hierarchy as a list of strings
async function getFileHierarchy() {
  // Get file hierarchy
  const hierarchy = await vscode.workspace.findFiles(
    '**/*',
    '**/node_modules/**',
    500
  );
  const paths = hierarchy.map(file => file.path);
  paths.sort((a, b) => a.localeCompare(b));
  return paths;
}

// Returns relevant files as a list of objects containing relative path and content
async function readRelevantFiles(paths: string[]) {
  console.log("VSCODE: reading relevant files ... ", paths)
  const fileContents = [];
  for (const path of paths) {
    const fileUri = vscode.Uri.parse(path);
    const fileContentBuffer = await vscode.workspace.fs.readFile(fileUri);
    const fileContent = new TextDecoder().decode(fileContentBuffer);

    // Extract relative path from path
    const relativePath = vscode.workspace.asRelativePath(fileUri, false);

    fileContents.push({ name: relativePath, content: fileContent });
  }
  return fileContents;
}
// Read current design doc, generate steps, and add those steps to the design doc
async function generateSteps(openai: any) {
  const { content: designDoc } = await readDesignDoc();
  if (!designDoc) {
    return {
      success: false,
      content: [],
    };
  }

  // Use OpenAI to generate steps
  const generateStepsPrompt = `
    Given the design doc:\n${designDoc}\n\n

    Generate a list of steps that need to be taken to complete the project from scratch to a functional minimum viable product (MVP). Each step should be small enough such that you can generate one file or a small piece of code for each step. If there a step you can't generate code for (for example, requiring assets or external tools), provide information on what the project owner should do instead.\n\n
    
    You may ONLY respond in the following JSON format:\n
    {\n
      "steps": list of objects where each object has the following keys:\n
      - "description": short string describing the step at a high level,\n
      - "information": string of additional information (use this sparingly),\n
    }\n\n

    For example, given a design doc that says "Develop a project to convert each word in a string from the command line into 'meow'.", you might respond with:\n
    {\n
      "steps": [\n
        {"description": "Create a Python file named meow.py."},\n
        {"description": "Write a program that converts each word in a string to 'meow'."},\n
      ]\n
    }\n

    Use concise, clear wording and short sentences.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: "system", content: generateStepsPrompt }],
      model: "gpt-4-turbo",
    });

    const message = response.choices[0]?.message.content;
    const { steps } = JSON.parse(message as string);
    
    // Set the step numbers
    steps.forEach((step: Step, idx: number) => {
      step.number = idx + 1;
    });
    
    // Add steps to the design doc
    const updatedDesignDoc = await updateDesignDoc(steps);
    if (!updatedDesignDoc) {
      return {
        success: false,
        content: [],
      };
    }

    return {
      success: true,
      content: steps,
    }
  } catch (error) {
    console.log("Error parsing code response:", error);
    return {
      success: false,
      content: [],
    }
  }
}

// Fetches a list of files relevant to the current task
async function getRelevantFiles(openai: any, designDoc: string, step: Step): Promise<File[]> {
  const paths = await getFileHierarchy();

  const relevantFilesPrompt = `
    The current list of files in the project is:\n${paths.join('\n')}\n\n

    Please respond with a list of relevant files that you would like to access when generating code for the current step. Each file you include will have its contents pasted for you to access before generating code.\n\n

    You may ONLY respond in the following JSON format:\n
    {\n
      "paths": list of strings of relevant file paths\n
    }\n\n

    An example response is:\n
    {\n
      "paths": ["file:///Users/john/projects/game/setup.py", "file:///Users/john/projects/game/play.py"]\n
    }\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: getInitialPrompt(designDoc, step),
      },
      {
        role: "system",
        content: relevantFilesPrompt,
      },
    ],
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
  });

  try {
    const message = response.choices[0]?.message.content;
    const { paths } = JSON.parse(message as string);
    console.log("Relevant paths identified: ", paths);
    const files = await readRelevantFiles(paths);
    return files;
  } catch (error) {
    console.log("Error parsing relevant paths response:", error);
    return [];
  }
}

// Formats file contents to be included in code generation prompt
function formatFileContents(files: File[]) {
  let fileContents = "";
  for (const file of files) {
    fileContents += `File: ${file.name}\n\n${file.content}\n\n`;
  }
  return fileContents;
}

/* Generate code OR add recommendations to design doc OR return a list of questions to ask the user */
async function generate(openai: any, step: Step) {
  const { number, description } = step;
  const outputChannel = vscode.window.createOutputChannel(`Generating step ${number}: ${description}`);

  /* Get design doc */
  const { content: designDoc } = await readDesignDoc();
  if (!designDoc) {
    return {
      success: false,
      newMessages: [],
    }
  }
  outputChannel.appendLine(`Design doc: ${designDoc}`);

  /* Grab Relevant Files */
  const files = await getRelevantFiles(openai, designDoc, step);
  const fileContents = formatFileContents(files);
  outputChannel.appendLine(`Relevant files: ${fileContents}`);

  /* Prompt */
  const codePrompt = `
    You are asked to generate code for ONLY the current step:\n${JSON.stringify(step)}\n\n
    Try not to generate code for future steps or steps that have already been completed. Prioritize generating code that is correct and functional for the current step. Use the design doc for context.\n\n
    
    Do one of three things:\n
    - If you can generate code, provide the code in the 'code' field and the filename in 'filename'.\n
    - If you can't generate because you need more information, append question strings for what the project owner needs to clarify in 'questions'.\n
    - If you can't generate because it is not a coding task, add information to the design doc in 'information' on what the project owner can do instead.\n\n

    You may ONLY respond in the following JSON format:\n
    {\n
      "result": string of "code" or "question" or "information" or null if unsuccessful,\n
      "information": use the information field from the given step and append new information as needed,\n
      "code": string of the code to generate or null if no code is generated,\n
      "filename": string of the filename to save the code as or null if no code is generated,\n
    }\n\n

    An example response to a step saying "Create a Python file called hello":\n
    {\n
      "result": "code",\n
      "information": null,\n
      "code": "print('Hello, world!')",\n
      "filename": "hello.py"\n
    }\n
    
    Or, for a step "Create sound files for each key.":\n
    {\n
      "result": "information",\n
      "step": "Cannot generate. Recommend using the Tone.js library to generate them.",\n
      "code": null,\n
      "filename": null\n
    }\n

    Or, for a step "Create a class called 'Car' with a method 'drive' that prints 'Vroom!'":\n
    {\n
      "result": "question",\n
      "information": null,\n
      "code": null,\n
      "filename": null,\n
      "questions": ["What programming language should the class be written in?"]\n
    }\n

    Here are the existing files in the codebase that you may need to reference. If the file you plan to generate is in the list, make sure to start by copying the file's entire contents and then make the appropriate changes:\n\n
    ${fileContents}\n
  `;

  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: getInitialPrompt(designDoc, step),
      },
      {
        role: "system",
        content: codePrompt,
      },
    ],
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
  });

  outputChannel.appendLine(`Code response: ${JSON.stringify(response)}`);

  try {
    const message = response.choices[0]?.message.content;
    const {
      result,
      information,
      code,
      filename,
      questions,
    } = JSON.parse(message as string);

    if (!result) {
      return {
        success: false,
        newMessages: [],
      }
    }

    /* QUESTION: If the response is a question, return the questions to ask the user */
    if (result === "question") {
      return {
        success: true,
        newMessages: [
          {
            role: "system",
            content: `I have a few questions for step ${number} before I can generate code:\n\n${questions.join("\n")}\n\nAdd these answers to your design doc and refresh to proceed.`,
          },
        ],
      }
    }

    /* INFORMATION: If the response is information, update the design doc */
    if (result === "information") {
      await updateDesignDoc([{ ...step, information }]);
      return {
        success: true,
        newMessages: [
          {
            role: "system",
            content: `Added information to step ${number}: ${information}`,
          },
        ],
      }
    }

    /* CODE: If the response is code, add the code to a new file */
    if (!code || !filename) {
      return {
        success: false,
        newMessages: [
          {
            role: "system",
            content: `Failed to generate code for step ${number}.`,
          },
        ],
      }
    }

    await addFile(filename, code);
    return {
      success: true,
      newMessages: [
        {
          role: "system",
          content: `Code generated for step ${number} in ${filename}. If you are unhappy with the code, modify the design doc and type <b>${EXECUTE_PHRASE}</b> to try again.`,
        }
      ]
    }
  } catch (error) {
    outputChannel.appendLine(`Error parsing code response: ${error}`);
    return {
      success: false,
      newMessages: [],
    }
  }
}

export { addFile, readDesignDoc, updateDesignDoc, generate, generateSteps, readAllFiles, getFileHierarchy, readRelevantFiles };
