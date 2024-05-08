import * as vscode from 'vscode';
import { readDesignDoc, addFile, updateDesignDoc } from '../utils';
import { templateDesignDoc } from '../constants';

export class ChatPanel implements vscode.WebviewViewProvider {
  private readonly disposables: vscode.Disposable[] = [];
  private messageEmitter = new vscode.EventEmitter<unknown>();
  readonly onDidReceiveMessage = this.messageEmitter.event;
  private webview: vscode.WebviewView["webview"] | undefined;

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public async resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
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

    this.onDidReceiveMessage((message: {
      type: string;
      value?: string | number | { code: string, filename: string };
    }) => {
      switch (message.type) {
        case "readDesignDoc":
          readDesignDoc().then((result) => {
            this.postMessageToWebview({
              type: "readDesignDoc",
              value: result
            });
          });
          break;
        case "addFile":
          const { code, filename } = message.value as { code: string, filename: string };
          addFile(filename, code).then(() => {
            this.postMessageToWebview({
              type: "addFile",
              value: message.value
            });
          })
          break;
        case "updateDesignDoc":
          const stepToUpdate = message.value as { code: string };
          updateDesignDoc(stepToUpdate).then((result) => {
            this.postMessageToWebview({
              type: "updateDesignDoc",
              value: result
            });
          });
          break;
        case "generateTemplateDesignDoc":
          addFile("design.md", templateDesignDoc).then(() => {
            this.postMessageToWebview({
              type: "generateTemplateDesignDoc",
              value: templateDesignDoc
            });
          });
          break;
        default:
          vscode.window.showInformationMessage(`Received unknown message: ${JSON.stringify(message)}`);
          break;
      }
    });

    this.webview.html = await this._getHtmlForWebview(this.webview, context);
  }

  public postMessageToWebview(message: unknown) {
    this.webview?.postMessage(message);
  }

  private async _getHtmlForWebview(webview: vscode.Webview, context: vscode.WebviewViewResolveContext): Promise<string> {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "web", "dist", "index.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "web", "dist", "index.css"));

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    // Fetch initial state and append it to environment variables
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
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}