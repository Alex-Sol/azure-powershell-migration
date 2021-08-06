import * as vscode from 'vscode';
var process = require("child_process");

export async function updateDiagnostics(documentUri: vscode.Uri , collection: vscode.DiagnosticCollection): Promise<void> {
	if (documentUri) {
		let diagnostics : vscode.Diagnostic[] = [];
		const command = `New-AzUpgradeModulePlan -FilePath "${documentUri.fsPath}" -FromAzureRmVersion 6.13.1 -ToAzVersion 6.1.0 | ConvertTo-Json -depth 10`;
		//await sleep(30000);
		process.exec(`pwsh -command "${command}"`,function (error : any, stdout: string, stderr : string) {
			if (error != null){
				vscode.window.showInformationMessage("error： " + error.message);
			}
			else
				vscode.window.showInformationMessage("success");
			if (stdout != null){
				var plans = JSON.parse(stdout).forEach((plan : any, index : any) => {
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
			collection.set(documentUri, diagnostics);
		});
	} else {
		collection.clear();
	}
}