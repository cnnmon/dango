import * as vscode from 'vscode';
import { ChatPanel } from './chat/ChatPanel';

// Activate is called the very first time any command is executed.
// Inside, you can register command names => the code that should be executed for each command.
export function activate(context: vscode.ExtensionContext) {

  vscode.window.showInformationMessage('Running the latest!');

  console.log('extension "dango" is now active!');

  //const chatPanel = new ChatPanel(context.extensionUri);
  //const viewProvider = vscode.window.registerWebviewViewProvider("dango.chat", chatPanel);

  let wakeupCommand = vscode.commands.registerCommand('dango.wakeup', () => {
    vscode.window.showInformationMessage('Dango is waking up!');
    const panel = vscode.window.createWebviewPanel(
      "dango.chat",
      "Dango",
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );
    panel.webview.html = getWebviewContent(context.extensionUri);
    setInterval(() => {
      panel.webview.postMessage({ command: "refresh" });
    }, 2000);
    panel.webview.onDidReceiveMessage((message) => console.log(message));
    vscode.commands.executeCommand("dango.chat.focus");
  });
  
  context.subscriptions.push(
    wakeupCommand
  );
}

export function deactivate() {}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getWebviewContent(extensionPath: vscode.Uri) {
  const scriptUri: vscode.Uri = vscode.Uri.joinPath(extensionPath, "web", "dist", "index.js");
  const styleUri: vscode.Uri = vscode.Uri.joinPath(extensionPath, "web", "dist", "index.css");
  const nonce = getNonce();

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <link rel="stylesheet" href="${styleUri}" />
    </head>
    <body>
      <noscript>You need to enable JavaScript to run this app.</noscript>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
  </html>
  `;
}