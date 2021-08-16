// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import shell = require("node-powershell")
import { Logger } from "./logging";
import * as process from "process";
import { homedir } from 'os';
import path = require("path");
import fs = require("fs");



export class PowershellProcess{
    private powershell : shell;
    private systemModulePath : string[];
    private log: Logger;

    public start() : void {
        this.powershell = new shell({
            executionPolicy: 'Bypass',
            noProfile: true
            });
    }
    
    public async getUpgradePlan(filePath : string, azureRmVersion: string, azVersion : string){
        //const command = `New-AzUpgradeModulePlan -FilePath "${filePath}" -FromAzureRmVersion "${azureRmVersion}" -ToAzVersion "${azVersion}" | ConvertTo-Json -depth 10`;
        if (this.powershell.invocationStateInfo == "Running"){
            await this.restart();
        }
        
        const command = `New-AzUpgradeModulePlan -FilePath "${filePath}" -FromAzureRmVersion "${azureRmVersion}" -ToAzVersion "${azVersion}" | ConvertTo-Json`;
        let planResult;
        this.powershell.addCommand(command);
        planResult = await this.powershell.invoke();
        
        return planResult;
    }

    public checkModuleExist(moduleName : string){
        this.getSystemModulePath();

        for (const moduleFolder of this.systemModulePath){
            const modulePath = path.resolve(moduleFolder, moduleName);
            if (fs.existsSync(modulePath))
                return true;
        }
        return false;
    }

    public async installModule(moduleName : string){
        const command = `Install-Module "${moduleName}" -Repository PSGallery -Force`;
        this.powershell.addCommand(command);
        await this.powershell.invoke().then(
            () => {this.log.write(`Install "${moduleName}" successed`);}
        );
    }
    

    public getSystemModulePath(){
        if (process.platform === "win32") {
            //this.systemModulePath = homedir() + "\\Documents\\PowerShell\\Modules\\";
            const PsModulePathes = process.env.PSMODULEPATH.split(";");
            this.systemModulePath = PsModulePathes;
        } else if (process.platform === "darwin" || process.platform === "linux") {
            //this.systemModulePath.push(homedir() + "/.local/share/powershell/Modules: usr/local/share/powershell/Modules");
            const PsModulePathes = process.env.PSMODULEPATH.split(":");
            this.systemModulePath = PsModulePathes;
        } 
        else
        {
            console.log("Unsupported operating system")!
        }
    }

    public async stop() : Promise<void> {
        await this.powershell.dispose();
    }

    public async restart() : Promise<void>{
        process.kill(this.powershell.pid);
        //await this.powershell.dispose();
        await this.start();
    }

}