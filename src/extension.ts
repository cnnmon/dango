import * as vscode from 'vscode';
import { ChatPanel } from './chat/ChatPanel';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('🍡 is now active!');

  const chatPanel = new ChatPanel(context.extensionUri);
  const webviewDisposable = vscode.window.registerWebviewViewProvider("dango.chat", chatPanel);

  const findCommand = vscode.commands.registerCommand('dango.find', () => {
    vscode.window.showInformationMessage("you've found dango!");
    vscode.commands.executeCommand("dango.chat.focus");
  });
  
  context.subscriptions.push(
    webviewDisposable,
    findCommand
  );
}

export function deactivate() {}
