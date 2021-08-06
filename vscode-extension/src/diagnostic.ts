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
		try{
			const planResult = await powershell.getUpgradePlan(documentUri.fsPath, azureRmVersion, azVersion);
			vscode.window.showInformationMessage("success")
			var plans = JSON.parse(planResult).forEach((plan : any, index : any) => {
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
			collection.set(documentUri, diagnostics);
		}
		catch(e){
			//console.log("Errot: " + e);
			vscode.window.showInformationMessage("Error: " + e.message);
		}
	} else {
		collection.clear();
	}
}