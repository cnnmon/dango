import * as vscode from 'vscode';

export class ChatPanel implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) { }

  // Panel
  private readonly disposables: vscode.Disposable[] = [];
  private messageEmitter = new vscode.EventEmitter<unknown>();
  readonly onDidReceiveMessage = this.messageEmitter.event;
  private webview: vscode.WebviewView["webview"] | undefined;

  // Model
  private messages: { author: string, message: string }[] = [];

  public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
    this.webview = webviewView.webview;

    this.webview.options = {
      enableScripts: true, // Allow scripts in the webview
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

    this.webview.onDidReceiveMessage((message) => {
      console.log('Received message from webview:', message);
    });

    this.webview.html = this._getHtmlForWebview(this.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    /*
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
    */

    return `<!DOCTYPE html>
      <html lang="en">
        <body>
          <p>Chat Panel</p>
        </body>
      </html>
    `
  }

  async receivePanelMessage(rawMessage: unknown) {
    const message = rawMessage as string;
    console.log("Received message", message);
    this.messages.push({ author: "user", message });
    this.webview?.postMessage({
      type: "updateState",
      state: { messages: this.messages },
    });
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