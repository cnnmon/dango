import * as vscode from 'vscode';
import { ChatPanel } from './chat/ChatPanel';

// Activate is called the very first time any command is executed.
// Inside, you can register command names => the code that should be executed for each command.
export function activate(context: vscode.ExtensionContext) {
  console.log('extension "dango" is now active!');
  const chatPanel = new ChatPanel(context.extensionUri);

  let wakeupCommand = vscode.commands.registerCommand('dango.wakeup', () => {
    vscode.window.showInformationMessage('Dango is waking up!');
    vscode.commands.executeCommand("dangochat.focus");
  });
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("dangochat", chatPanel),
    wakeupCommand
  );
}

export function deactivate() {}
