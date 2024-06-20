import * as vscode from 'vscode';

export type Step = {
  number: number;
  description: string;
  information: string;
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

# Steps
## 1. Create a new Next.js project.
## 2. Import all audio files into the project.
## 3. Create a mapping of keys to audio files.
## 4. Create a front-end where you can click on all keys.
For now, each key doesn't need to play the sound, it can instead console log the key.
## 5. Clicking keys will now play the sound.
`;

const getInitialPrompt = (designDoc: string, { description }: Step) => `
  You are a pair programmer whose job is to generate code given a 'living design document', which you and the project owner will both update occasionally.\n\n

  It is important to follow the current state of the 'living design doc':\n${designDoc}\n\n

  You are currently on step ${description}.\n
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
  const textFileExtensions = [
    '.txt', '.html', '.htm', '.js', '.css', '.json', 
    '.xml', '.md', '.csv', '.log', '.yml', '.yaml', 
    '.ts', '.jsx', '.tsx', '.sh', '.py', '.java', 
    '.c', '.cpp', '.h', '.hpp', '.rs', '.go', '.php',
    '.rb', '.pl', '.r', '.swift', '.kt', '.gradle'
  ];

  for (const path of paths) {
    // Only read text-based files
    if (!textFileExtensions.some(ext => path.endsWith(ext))) {
      continue;
    }

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
// To save time, just generate template steps for now
async function generateSteps() {
  const { content: designDoc } = await readDesignDoc();
  if (!designDoc) {
    return {
      success: false,
      content: [],
    };
  }

  const steps = [
    {
      number: 1,
      description: "Create a new Next.js project.",
      information: "",
    },
    {
      number: 2,
      description: "Import all audio files into the project.",
      information: "",
    },
    {
      number: 3,
      description: "Create a mapping of keys to audio files.",
      information: "",
    },
    {
      number: 4,
      description: "Create a front-end where you can click on all keys.",
      information: "For now, each key doesn't need to play the sound, it can instead console log the key.",
    },
    {
      number: 5,
      description: "Clicking keys will now play the sound.",
      information: "Use Tone.js.",
    },
  ]

  updateDesignDoc(steps);
  
  return {
    success: true,
    content: steps,
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
    model: "gpt-3.5-turbo",
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

  try {
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
        "type": string of "code" or "question" or "information" or null if unsuccessful,\n
        "information": use the information field from the given step and append new information as needed,\n
        "code": string of the code to generate or null if no code is generated,\n
        "filename": string of the filename to save the code as or null if no code is generated,\n
      }\n\n

      An example response to a step saying "Create a Python file called hello":\n
      {\n
        "type": "code",\n
        "information": null,\n
        "code": "print('Hello, world!')",\n
        "filename": "hello.py"\n
      }\n
      
      Or, for a step "Create sound files for each key.":\n
      {\n
        "type": "information",\n
        "step": "Cannot generate. Recommend using the Tone.js library to generate them.",\n
        "code": null,\n
        "filename": null\n
      }\n

      Or, for a step "Create a class called 'Car' with a method 'drive' that prints 'Vroom!'":\n
      {\n
        "type": "question",\n
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
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
    });

    outputChannel.appendLine(`Code response: ${JSON.stringify(response)}`);
    const message = response.choices[0]?.message.content;
    outputChannel.appendLine(`Message: ${message}`);

    const result = JSON.parse(message as string);

    if (!result) {
      return {
        success: false,
        newMessages: [
          `Failed to generate code. Response: ${message}`,
        ],
      }
    }

    const { type } = result;

    /* QUESTION: If the response is a question, return the questions to ask the user */
    if (type === "question") {
      const { questions } = result;
      return {
        success: true,
        newMessages: [
          `I have a few questions about step ${number} before I can generate code:\n\n${questions.join("\n")}\n\nAnswer some or all of these questions in your design doc and try again to proceed.`,
        ],
      }
    }

    /* INFORMATION: If the response is information, update the design doc */
    if (type === "information") {
      const { information } = result;
      await updateDesignDoc([{ ...step, information }]);
      return {
        success: true,
        newMessages: [
          `Information added to the design doc: ${information}. (If you're not satisfied, modify the design doc and try again.)`
        ],
      }
    }

    /* CODE: If the response is code, add the code to a new file */
    const { code, filename } = result;

    if (!code) {
      return {
        success: false,
        newMessages: [
          `Failed to generate code. Response: ${message}`,
        ],
      }
    }

    // If no filename, treat it as if we were appending the code the design doc
    if (!filename) {
      await updateDesignDoc([{ ...step, information: code }]);
      return {
        success: true,
        newMessages: [
          `Information added to the design doc: ${code}. (If you're not satisfied, modify the design doc and try again.)`,
        ],
      }
    }

    await addFile(filename, code);
    return {
      success: true,
      newMessages: [
        `Code generated for step ${number} in ${filename}. (If you're not satisfied, modify the design doc and try again.)`,
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

export { addFile, readDesignDoc, updateDesignDoc, generate, generateSteps };
