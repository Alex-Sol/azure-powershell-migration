// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {BreakingChangeInfo} from './quickFix';
import {updateDiagnostics} from './diagnostic'
import {
    getPlatformDetails, IPlatformDetails, IPowerShellExeDetails,
    OperatingSystem, PowerShellExeFinder } from "./platform";
import { Logger } from "./logging";

const PackageJSON: any = require("../package.json");


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "demo-client" is now active!');

	let platformDetails = getPlatformDetails();
	const osBitness = platformDetails.isOS64Bit ? "64-bit" : "32-bit";
    const procBitness = platformDetails.isProcess64Bit ? "64-bit" : "32-bit";

	let log;
	log = new Logger();
	log.write(
		`Visual Studio Code v${vscode.version} ${procBitness}`,
		`${PackageJSON.displayName} Extension v${PackageJSON.version}`,
		`Operating System: ${OperatingSystem[platformDetails.operatingSystem]} ${osBitness}`);
	log.startNewLog('normal');


	var powershellExeFinder = new PowerShellExeFinder();
	let powerShellExeDetails;
	try {
		

		powerShellExeDetails = powershellExeFinder.getFirstAvailablePowerShellInstallation();

	} catch (e) {
		log.writeError(`Error occurred while searching for a PowerShell executable:\n${e}`);
	}


	if (!powerShellExeDetails) {
		const message = "Unable to find PowerShell."
			+ " Do you have PowerShell installed?"
			+ " You can also configure custom PowerShell installations"
			+ " with the 'powershell.powerShellAdditionalExePaths' setting.";

		log.writeAndShowErrorWithActions(message, [
			{
				prompt: "Get PowerShell",
				action: async () => {
					const getPSUri = vscode.Uri.parse("https://aka.ms/get-powershell-vscode");
					vscode.env.openExternal(getPSUri);
				},
			},
		]);
		return;
	}

	var process = require("child_process");
	let checkModuleCommand = "Get-Module Az.Tools.Migration -ListAvailable";
	process.exec(`pwsh -command "${checkModuleCommand}"`,async function (error : any, stdout: string, stderr : string) {
		if (!stdout){
			try{
				let installModuleCommand = "Install-Module az.tools.migration -Repository PSGallery -Force";
				await process.exec(`pwsh -command "${installModuleCommand}"`);
				vscode.window.showInformationMessage("Install success!");
			}
			catch(e){
				vscode.window.showInformationMessage("Please install the migration module for youself!")
			}
			
		}
		else
			vscode.window.showInformationMessage("The mechine has migration module!");
	});



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


