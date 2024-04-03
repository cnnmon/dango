import * as vscode from 'vscode';

// Prints all files in the current workspace, excluding node_modules
async function viewFiles() {
	const outputChannel = vscode.window.createOutputChannel("Project Hierarchy");
	outputChannel.clear(); // Clear previous output
	outputChannel.show(true); // Bring the Output panel to focus
	const pattern = '**/*'; // Adjust this pattern as needed

	try {
    const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 500); // Exclude node_modules, limit to 500 files
    files.forEach(file => {
      outputChannel.appendLine(file.fsPath); 
    });
	} catch (error) {
		outputChannel.appendLine(`Error listing project files: ${error}`);
	}

	outputChannel.appendLine('Project Hierarchy view complete!');
}

// Creates a new file in the current working directory
// TODO: Does not handle file already exists error besides logging it
async function addFile() {
  const outputChannel = vscode.window.createOutputChannel("Add File");
  outputChannel.clear(); // Clear previous output
  outputChannel.show(true); // Bring the Output panel to focus

  const fileName = 'new-file.py';
  const defaultContent = `print('Hello, world!')`;

  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      outputChannel.appendLine('No workspace folder found.');
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath; // Get the first workspace folder
    const filePath = `${workspacePath}/${fileName}`;
    const fileUri = vscode.Uri.file(filePath);

    const fileExists = await vscode.workspace.fs.stat(fileUri).then(() => true, () => false);
    if (fileExists) {
      outputChannel.appendLine(`File ${fileName} already exists.`);
      return;
    }

    // Convert the defaultContent string to a Uint8Array
    const textEncoder = new TextEncoder(); // TextEncoder is a global object
    const content = textEncoder.encode(defaultContent);

    await vscode.workspace.fs.writeFile(fileUri, content);
    outputChannel.appendLine(`File ${fileName} created with default content.`);
  } catch (error) {
    outputChannel.appendLine(`Error creating file: ${error}`);
  }

  outputChannel.appendLine('Add File complete!');
}

export { viewFiles, addFile };