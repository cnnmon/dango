"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPanel = void 0;
var vscode = __importStar(require("vscode"));
var ChatPanel = /** @class */ (function () {
    function ChatPanel(_extensionUri) {
        this._extensionUri = _extensionUri;
        // Panel
        this.disposables = [];
        this.messageEmitter = new vscode.EventEmitter();
        this.onDidReceiveMessage = this.messageEmitter.event;
        // Model
        this.messages = [];
    }
    ChatPanel.prototype.resolveWebviewView = function (webviewView, context, _token) {
        var _this = this;
        this.webview = webviewView.webview;
        this.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        var receiveMessageDisposable = this.webview.onDidReceiveMessage(function (message) {
            _this.messageEmitter.fire(message);
        });
        this.disposables.push(webviewView.onDidDispose(function () {
            receiveMessageDisposable.dispose();
        }));
        this.webview.onDidReceiveMessage(function (message) {
            console.log('Received message from webview:', message);
        });
        this.webview.html = this._getHtmlForWebview(this.webview);
    };
    ChatPanel.prototype._getHtmlForWebview = function (webview) {
        var scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "web", "dist", "index.js"));
        var styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "src", "web", "dist", "index.css"));
        // Use a nonce to whitelist which scripts can be run
        var nonce = getNonce();
        return "<!DOCTYPE html>\n    <html lang=\"en\">\n      <head>\n        <meta charset=\"UTF-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n        <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'nonce-".concat(nonce, "'; style-src ").concat(webview.cspSource, " 'unsafe-inline';\">\n        <title>Chat</title>\n        <link rel=\"stylesheet\" href=\"").concat(styleUri, "\" />\n      </head>\n      <body>\n        <div id=\"root\"></div>\n        <noscript>You need to enable JavaScript to run this app.</noscript>\n        <script>\n          const vscode = acquireVsCodeApi();\n          window.onload = () => {\n              vscode.postMessage({\n                type: 'message',\n                value: 'Hello webview'\n              });\n          }\n        </script>\n        <script nonce=\"").concat(nonce, "\" src=\"").concat(scriptUri, "\"></script>\n      </body>\n    </html>\n    ");
    };
    ChatPanel.prototype.receivePanelMessage = function (rawMessage) {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            var _a;
            return __generator(this, function (_b) {
                message = rawMessage;
                vscode.window.showInformationMessage("Recieved message: " + message);
                this.messages.push({ author: "user", message: message });
                (_a = this.webview) === null || _a === void 0 ? void 0 : _a.postMessage({
                    type: "updateState",
                    state: { messages: this.messages },
                });
                return [2 /*return*/];
            });
        });
    };
    return ChatPanel;
}());
exports.ChatPanel = ChatPanel;
function getNonce() {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
