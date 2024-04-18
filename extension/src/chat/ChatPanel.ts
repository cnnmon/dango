import * as vscode from 'vscode';

export class ChatPanel implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    const webview = webviewView.webview;

    webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webview.html = this._getHtmlForWebview(webview);

    webview.onDidReceiveMessage((data) => {
      vscode.window.showInformationMessage(data.text);
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "web", "dist", "index.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "web", "dist", "index.css"));

    // Use a nonce to whitelist which scripts can be run
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
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}