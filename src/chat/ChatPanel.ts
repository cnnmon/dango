import * as vscode from 'vscode';

export class ChatPanel implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) { }

  private readonly disposables: vscode.Disposable[] = [];
  private messageEmitter = new vscode.EventEmitter<unknown>();
  readonly onDidReceiveMessage = this.messageEmitter.event;
  private webview: vscode.WebviewView["webview"] | undefined;

  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    this.webview = webviewView.webview;
    this.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    const receiveMessageDisposable = this.webview.onDidReceiveMessage(
      (message: unknown) => {
        this.messageEmitter.fire(message);
      }
    );

    this.disposables.push(
      webviewView.onDidDispose(() => {
        receiveMessageDisposable.dispose();
      })
    );

    this.onDidReceiveMessage((message) => {
      this.receivePanelMessage(message);
    });

    this.webview.html = this._getHtmlForWebview(this.webview);
  }

  public postMessageToWebview(message: unknown) {
    this.webview?.postMessage(message);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "web", "dist", "index.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "web", "dist", "index.css"));

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    const envVariables = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    }

    const csp = `default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline'; connect-src https://api.openai.com;`;

    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <title>Chat</title>
        <link rel="stylesheet" href="${styleUri}" />
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const env = JSON.parse('${JSON.stringify(envVariables)}');
          window.env = env;
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>
    `;
  }

  async receivePanelMessage(rawMessage: unknown) {
    vscode.window.showInformationMessage(`Received message: ${JSON.stringify(rawMessage)}`);
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