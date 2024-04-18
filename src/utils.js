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
exports.addFile = exports.viewFiles = void 0;
var vscode = __importStar(require("vscode"));
// Prints all files in the current workspace, excluding node_modules
function viewFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var outputChannel, pattern, files, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    outputChannel = vscode.window.createOutputChannel("Project Hierarchy");
                    outputChannel.clear(); // Clear previous output
                    outputChannel.show(true); // Bring the Output panel to focus
                    pattern = '**/*';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, vscode.workspace.findFiles(pattern, '**/node_modules/**', 500)];
                case 2:
                    files = _a.sent();
                    files.forEach(function (file) {
                        outputChannel.appendLine(file.fsPath);
                    });
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    outputChannel.appendLine("Error listing project files: ".concat(error_1));
                    return [3 /*break*/, 4];
                case 4:
                    outputChannel.appendLine('Project Hierarchy view complete!');
                    return [2 /*return*/];
            }
        });
    });
}
exports.viewFiles = viewFiles;
// Creates a new file in the current working directory
// TODO: Does not handle file already exists error besides logging it
function addFile() {
    return __awaiter(this, void 0, void 0, function () {
        var outputChannel, fileName, defaultContent, workspaceFolders, workspacePath, filePath, fileUri, fileExists, textEncoder, content, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    outputChannel = vscode.window.createOutputChannel("Add File");
                    outputChannel.clear(); // Clear previous output
                    outputChannel.show(true); // Bring the Output panel to focus
                    fileName = 'new-file.py';
                    defaultContent = "print('Hello, world!')";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    workspaceFolders = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders) {
                        outputChannel.appendLine('No workspace folder found.');
                        return [2 /*return*/];
                    }
                    workspacePath = workspaceFolders[0].uri.fsPath;
                    filePath = "".concat(workspacePath, "/").concat(fileName);
                    fileUri = vscode.Uri.file(filePath);
                    return [4 /*yield*/, vscode.workspace.fs.stat(fileUri).then(function () { return true; }, function () { return false; })];
                case 2:
                    fileExists = _a.sent();
                    if (fileExists) {
                        outputChannel.appendLine("File ".concat(fileName, " already exists."));
                        return [2 /*return*/];
                    }
                    textEncoder = new TextEncoder();
                    content = textEncoder.encode(defaultContent);
                    return [4 /*yield*/, vscode.workspace.fs.writeFile(fileUri, content)];
                case 3:
                    _a.sent();
                    outputChannel.appendLine("File ".concat(fileName, " created with default content."));
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    outputChannel.appendLine("Error creating file: ".concat(error_2));
                    return [3 /*break*/, 5];
                case 5:
                    outputChannel.appendLine('Add File complete!');
                    return [2 /*return*/];
            }
        });
    });
}
exports.addFile = addFile;
