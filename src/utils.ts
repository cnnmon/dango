import * as vscode from 'vscode';

export type Step = {
  number: number;
  description: string;
  information: string;
}

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

//Return a list of names and contents of all files in the workspace
async function readAllFiles() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder open.");
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath; // Get the first workspace folder
  const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(workspacePath));

  //Create list fileContents that iterates over files and creates an object for each containing name and content
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
      - "information": string of additional information needed for the step that may be helpful for the project owner to know,\n
    }\n\n

    For example, given a design doc that says "Develop a project to convert each word in a string from the command line into 'meow'.", you might respond with:\n
    {\n
      "steps": [\n
        {"description": "Create a Python file named meow.py."},\n
        {"description": "Write a program that converts each word in a string to 'meow'.", "information": "Use the split() method to separate each word in the string."},\n
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

export { addFile, readDesignDoc, updateDesignDoc, readAllFiles, generateSteps };
