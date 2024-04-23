import * as vscode from 'vscode';

// Find the design document in the current root workspace
async function readDesignDoc() {
  const outputChannel = vscode.window.createOutputChannel("Find Design Doc");
  outputChannel.clear();
  outputChannel.show(true);

  try {
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

    // Get file hierarchy
    const hierarchy = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 500);
    const hierarchyText = hierarchy.sort((a, b) => a.path.localeCompare(b.path)).join('\n');
    const hierarchySection = `# Files\n${hierarchyText}`;

    // Check if "# Files" header exists
    const filesHeaderIndex = content.indexOf('# Files');
    if (filesHeaderIndex !== -1) {
      const endOfSectionIndex = content.indexOf('\n#', filesHeaderIndex + 1);
      if (endOfSectionIndex !== -1) {
        content = content.substring(0, filesHeaderIndex) + hierarchySection + '\n' + content.substring(endOfSectionIndex);
      } else {
        content = content.substring(0, filesHeaderIndex) + hierarchySection;
      }
    } else {
      content += '\n\n' + hierarchySection;
    }

    // Write the updated content back to the design document
    const textEncoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(designDocUri, textEncoder.encode(content));
    outputChannel.appendLine('Design document updated successfully!');
    return content;
  } catch (error) {
    outputChannel.appendLine(`Error finding design document: ${error}`);
    return null;
  }
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

export { addFile, readDesignDoc };