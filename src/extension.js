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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
var vscode = __importStar(require("vscode"));
var ChatPanel_1 = require("./chat/ChatPanel");
// Activate is called the very first time any command is executed.
// Inside, you can register command names => the code that should be executed for each command.
function activate(context) {
    vscode.window.showInformationMessage('dango is now active!');
    var chatPanel = new ChatPanel_1.ChatPanel(context.extensionUri);
    var webviewDisposable = vscode.window.registerWebviewViewProvider("dango.chat", chatPanel);
    var wakeupCommand = vscode.commands.registerCommand('dango.wakeup', function () {
        vscode.window.showInformationMessage('dango is waking up!?!?!');
        vscode.commands.executeCommand("dango.chat.focus");
    });
    chatPanel.onDidReceiveMessage(chatPanel.receivePanelMessage.bind(chatPanel));
    context.subscriptions.push(webviewDisposable, wakeupCommand);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
