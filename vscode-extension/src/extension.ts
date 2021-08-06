// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {BreakingChangeInfo} from './quickFix';
import {updateDiagnostics} from './diagnostic'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "demo-client" is now active!');

	const collection = vscode.languages.createDiagnosticCollection('test');
	if (vscode.window.activeTextEditor) {
		updateDiagnostics(vscode.window.activeTextEditor.document.uri, collection);
	}

	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(editor => {
		if (editor) {
			updateDiagnostics(editor.uri, collection);
		}
	}))

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(editor => {
		if (editor) {
			updateDiagnostics(editor.uri, collection);
		}
	}))

	let breakingChangeInfo = new BreakingChangeInfo();
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider({ language: 'powershell' }, breakingChangeInfo , {
			providedCodeActionKinds: BreakingChangeInfo.providedCodeActionKinds
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}


