import * as vscode from 'vscode';
import { viewFiles, addFile } from './utils';

/**
 * Activate is called the very first time any command is executed.
 * Inside, you can register command names => the code that should be executed for each command.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('extension "dango" is now active!');

  let viewFilesCommand = vscode.commands.registerCommand('dango.viewFiles', () => {
    viewFiles();
  });

  let addFileCommand = vscode.commands.registerCommand('dango.addFile', () => {
    addFile();
  });
  
  // Add to a list of disposables which are disposed when this extension is deactivated.
  context.subscriptions.push(viewFilesCommand);
  context.subscriptions.push(addFileCommand);
}

export function deactivate() {}
