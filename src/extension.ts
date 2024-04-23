import * as vscode from 'vscode';
import { ChatPanel } from './chat/ChatPanel';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('dango is now active!?');

  const chatPanel = new ChatPanel(context.extensionUri);
  const webviewDisposable = vscode.window.registerWebviewViewProvider("dango.chat", chatPanel);

  const wakeupCommand = vscode.commands.registerCommand('dango.wakeup', () => {
    vscode.window.showInformationMessage('dango is waking up!');
    vscode.commands.executeCommand("dango.chat.focus");
  });
  
  context.subscriptions.push(
    webviewDisposable,
    wakeupCommand
  );
}

export function deactivate() {}
