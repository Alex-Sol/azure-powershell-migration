/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

export const BREAKING_CHANGE = 'breaking change';
export const DEPRECATED_CMDLET = 'deprecated cmdlet';
export const CMDLET_RENAME = 'cmdlet rename';
export const PARAMETER_CHANGE = 'parameter change';
export const DO_NOTHING = 'do nothing';

export const GET_INFO_COMMAND = 'getInfo';
export const GET_DEPRE_INFO_COMMAND = 'getdepreInfo';

/**
 * Run CodeAction when click the "Quick Fix"
 */
export class QuickFixProvider implements vscode.CodeActionProvider {

    constructor() { }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {

        return context.diagnostics.map(diagnostic => this.getAutoFixCodeAction(diagnostic));

    }

    private getAutoFixCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
        let fix = new vscode.CodeAction("", vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        let editor = vscode.window.activeTextEditor;

        if (!editor) {
            return fix;
        }

        const document = editor.document;
        const range = diagnostic.range;
        const lineNumber = range.start.line;
        const line = editor.document.lineAt(lineNumber);
        const targetCmdletName: string = diagnostic.source;

        switch (diagnostic.code) {
            case "RENAME": {
                fix.title = "Auto fix to " + targetCmdletName;
                fix.edit.replace(document.uri, range, targetCmdletName);
                break;
            }
            case "DO_NOTHING": {
                return null;
            }
        }

        return fix;
    }
}