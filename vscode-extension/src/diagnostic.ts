// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import { PowershellProcess } from './powershell';


export async function updateDiagnostics(
	documentUri: vscode.Uri , 
	collection: vscode.DiagnosticCollection, 
	powershell : PowershellProcess,
	azureRmVersion : string,
	azVersion : string): Promise<void> {
	if (documentUri) {
		let diagnostics : vscode.Diagnostic[] = [];
			const planResult = await powershell.getUpgradePlan(documentUri.fsPath, azureRmVersion, azVersion);
			vscode.window.showInformationMessage("Node-Powershell Success!");
			updateDiagnosticsMessage(planResult, diagnostics);
			vscode.window.showInformationMessage(`Diagnostics Number : ${diagnostics.length}  `);
			collection.set(documentUri, diagnostics);	
	} else {
		collection.clear();
	}
}

function updateDiagnosticsMessage(plansStr : string, diagnostics : vscode.Diagnostic[]){
	var plans = JSON.parse(plansStr).forEach((plan : any, index : any) => {
		//console.log(plan);
		let range = new vscode.Range(new vscode.Position(plan.SourceCommand.StartLine - 1, plan.SourceCommand.StartColumn - 1), 
											new vscode.Position(plan.SourceCommand.EndLine - 1, plan.SourceCommand.EndPosition - 1));
		let message = plan.PlanResultReason;
		let diagnostic = new vscode.Diagnostic(range, message);
		if (plan.PlanSeverity == 1){
			diagnostic.severity = vscode.DiagnosticSeverity.Error;
			diagnostic.code = "DO_NOTHING";
			diagnostic.source = '';
		}
		else if (plan.PlanSeverity == 2){
			diagnostic.severity = vscode.DiagnosticSeverity.Information;
			diagnostic.code = "DO_NOTHING";
			diagnostic.source = '';
		}
		else{	//plan.PlanSeverity == 3
			diagnostic.severity = vscode.DiagnosticSeverity.Warning;
			diagnostic.code = "RENAME";
			diagnostic.source = plan.Replacement;
		}
		diagnostics.push(diagnostic);
	});
}

