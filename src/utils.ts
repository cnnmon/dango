import * as vscode from 'vscode';

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

  const { content, uri: designDocUri } = designDoc;
  let newContent = content;

  // Get file hierarchy
  const hierarchy = await vscode.workspace.findFiles(
    '**/*',
    '**/node_modules/**',
    500
  );
  const hierarchyText = hierarchy
    .sort((a, b) => a.path.localeCompare(b.path))
    .join('\n');
  const hierarchySection = `# Files\n${hierarchyText}`;

  // Check if "# Files" header exists
  const filesHeaderIndex = content.indexOf('# Files');
  if (filesHeaderIndex !== -1) {
    const endOfSectionIndex = content.indexOf('\n#', filesHeaderIndex + 1);
    if (endOfSectionIndex !== -1) {
      newContent =
        content.substring(0, filesHeaderIndex) +
        hierarchySection +
        '\n' +
        content.substring(endOfSectionIndex);
    } else {
      newContent = content.substring(0, filesHeaderIndex) + hierarchySection;
    }
  } else {
    newContent += '\n\n' + hierarchySection;
  }

  // Check if "# Files" header needs updating
  if (newContent === content) {
    outputChannel.appendLine(
      'Design document already contains file hierarchy.'
    );
    return {
      success: true,
      content: newContent,
    };
  }

  // Write the updated content back to the design document
  const textEncoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(
    designDocUri,
    textEncoder.encode(newContent)
  );
  outputChannel.appendLine('Design document updated successfully!');
  return {
    success: true,
    content: newContent,
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
async function updateDesignDoc(updatedStep: { number: number, description: string, information: string }) {
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
    let finishedInformation = false;
  
    sections.forEach(section => {
      if (inStepsSection) {
        if (section.startsWith('##')) { // is description
          currentStepNumber += 1;
          if (currentStepNumber === updatedStep.number) {
            updatedText.push(`## ${updatedStep.description}`);
            return;
          }
        } else { // is information
          if (currentStepNumber === updatedStep.number && !finishedInformation) {
            finishedInformation = true;
            updatedText.push(updatedStep.information + '\n');
            return;
          }
        }
      } else if (section.startsWith('# Steps')) {
        inStepsSection = true;
      }
      updatedText.push(section);
    });
    
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



export { addFile, readDesignDoc, updateDesignDoc, readAllFiles};
