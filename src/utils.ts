import * as vscode from 'vscode';

async function findDesignDoc(outputChannel) {
  // Find the design document
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    outputChannel.appendLine('No workspace folder found.');
    return null;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath;
  const designDocPath = `${workspacePath}/design.md`;
  const designDocUri = vscode.Uri.file(designDocPath);
  const designDocExists = await vscode.workspace.fs.stat(designDocUri).then(() => true, () => false);

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
  const outputChannel = vscode.window.createOutputChannel("Read Design Doc");
  outputChannel.clear();
  outputChannel.show(true);

  const designDoc = await findDesignDoc(outputChannel);
  if (!designDoc) return {
    success: false,
    content: '',
  }

  const { content, uri: designDocUri } = designDoc;
  let newContent = content;

  // Get file hierarchy
  const hierarchy = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 500);
  const hierarchyText = hierarchy.sort((a, b) => a.path.localeCompare(b.path)).join('\n');
  const hierarchySection = `# Files\n${hierarchyText}`;
  
  // Check if "# Files" header exists
  const filesHeaderIndex = content.indexOf('# Files');
  if (filesHeaderIndex !== -1) {
    const endOfSectionIndex = content.indexOf('\n#', filesHeaderIndex + 1);
    if (endOfSectionIndex !== -1) {
      newContent = content.substring(0, filesHeaderIndex) + hierarchySection + '\n' + content.substring(endOfSectionIndex);
    } else {
      newContent = content.substring(0, filesHeaderIndex) + hierarchySection;
    }
  } else {
    newContent += '\n\n' + hierarchySection;
  }

  // Check if "# Files" header needs updating
  if (newContent === content) {
    outputChannel.appendLine('Design document already contains file hierarchy.');
    return {
      success: true,
      content: newContent,
    };
  }

  // Write the updated content back to the design document
  const textEncoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(designDocUri, textEncoder.encode(newContent));
  outputChannel.appendLine('Design document updated successfully!');
  return {
    success: true,
    content: newContent,
  };
}

// Creates a new file in the current working directory
async function addFile(fileName, rawContent) {
  const outputChannel = vscode.window.createOutputChannel("Add File");
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
    const fileExists = await vscode.workspace.fs.stat(fileUri).then(() => true, () => false);
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
async function updateDesignDoc(stepToUpdate) {
  const outputChannel = vscode.window.createOutputChannel("Update Design Doc");
  outputChannel.clear();
  outputChannel.show(true);

  const designDoc = await findDesignDoc(outputChannel);
  if (!designDoc) return;

  const { content, uri: designDocUri } = designDoc;

  try {
    // Split the original document into sections
    const sections = content.split('# Steps');
    const objective = sections[0];
    const stepsAndFiles = sections[1].split('# Files');
    outputChannel.appendLine(`\nStep: ${JSON.stringify(stepToUpdate)}\n`);

    // Process steps
    const steps = stepsAndFiles[0].split(/\n(?=\d)/); // Split steps by new lines that start with a number
    const updatedSteps = steps.map(step => {
        const stepNumberMatch = step.match(/^\d+/);
        outputChannel.appendLine(`Processing step: ${step}`);
        if (!stepNumberMatch) return step; // Skip if no step number is found (handles empty lines or headers)
        
        const stepNumber = parseInt(stepNumberMatch[0], 10);
        if (stepNumber === stepToUpdate.number) {
            outputChannel.appendLine(`Found step ${stepNumber} to update in the design document.`);
            const files = stepToUpdate.files && stepToUpdate.files.length ? `\nFiles:\n${stepToUpdate.files.join('\n')}` : '';
            return `${stepNumber}. ${stepToUpdate.description}\n${stepToUpdate.information}${files}`;
        }
        return step;
    });

    // Reconstruct the document
    outputChannel.appendLine(`\nNew steps: ${updatedSteps}\n`);
    const newStepsSection = updatedSteps.join('\n');
    outputChannel.appendLine(`\nNew steps: ${newStepsSection}\n`);
    const filesSection = stepsAndFiles[1];
    outputChannel.appendLine(`Files: ${filesSection}\n`);
    const newContent = `${objective}# Steps${newStepsSection}# Files${filesSection}`;
    outputChannel.appendLine(`\nNew content: ${newContent}\n`);

    // Write the updated content back to the design document
    const textEncoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(designDocUri, textEncoder.encode(newContent));
    outputChannel.appendLine(`Design document updated successfully: ${newContent}`);
    return newContent;
  } catch (error) {
    outputChannel.appendLine(`Error updating design document: ${error}`);
    return null;
  }
}

export { addFile, readDesignDoc, updateDesignDoc };