function Invoke-AzUpgradeModulePlan
{
    <#
    .SYNOPSIS
        Invokes the specified module upgrade plan.

    .DESCRIPTION
        Invokes the specified module upgrade plan.

        IMPORTANT: This step is destructive if the FileEditMode parameter is set to 'ModifyExistingFiles'. This mode makes file edits in place according to the module upgrade plan. There is no "undo" operation. Always ensure that you have a backup copy of the target PowerShell script or module.

        To save the upgraded script contents into new files (leaving the originals unmodified) specify 'SaveChangesToNewFiles' with the FileEditMode parameter.

        The upgrade plan is generated by running the New-AzUpgradeModulePlan cmdlet.

    .PARAMETER Plan
        Specifies the upgrade plan steps to execute. This is generated from New-AzUpgradeModulePlan.

    .PARAMETER FileEditMode
        Specifies the file edit mode to determine if the upgrade plan should be executed in place (modifies existing files) or if changes should be saved to new files. Specify 'ModifyExistingFiles' to modify your script files in place, or 'SaveChangesToNewFiles' to save new PowerShell files (leaving your existing files unmodified).

    .EXAMPLE
        The following example invokes the upgrade plan for a PowerShell module named "myModule" and saves the updated file contents into new files (leaving original files unmodified).

        # step 1: generate a plan and save it to a variable.
        $plan = New-AzUpgradeModulePlan -FromAzureRmVersion 6.13.1 -ToAzVersion 5.5.0 -DirectoryPath 'C:\Scripts\myModule'

        # step 2: write the plan to the console to review the upgrade steps, warnings, and errors.
        $plan

        # step 3: run the automatic upgrade plan (saving updated scripts to new files) and collects the results in a variable.
        $results = Invoke-AzUpgradeModulePlan -Plan $Plan -FileEditMode SaveChangesToNewFiles

        # step 4: write the upgrade results to the console to review the result for each upgrade step.
        $results

    .EXAMPLE
        The following example invokes the upgrade plan for a PowerShell module named "myModule" and modifies the existing files in place.

        # step 1: generate a plan and save it to a variable.
        $plan = New-AzUpgradeModulePlan -FromAzureRmVersion 6.13.1 -ToAzVersion 5.5.0 -DirectoryPath 'C:\Scripts\myModule'

        # step 2: write the plan to the console to review the upgrade steps, warnings, and errors.
        $plan

        # step 3: run the automatic upgrade plan (modifying the files in place) and collects the results in a variable.
        $results = Invoke-AzUpgradeModulePlan -Plan $Plan -FileEditMode ModifyExistingFiles

        # step 4: write the upgrade results to the console to review the result for each upgrade step.
        $results
    #>
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
    Param
    (
        [Parameter(
            Mandatory=$true,
            HelpMessage='Specify the upgrade plan steps to follow. This is generated from New-AzUpgradeModulePlan')]
        [UpgradePlan[]]
        $Plan,

        [Parameter(
            Mandatory=$true,
            HelpMessage='Specify the file edit mode to determine if the upgrade plan should be executed in place (modify existing files) or if changes should be saved to new files.')]
        [EditMode]
        [ValidateNotNullOrEmpty()]
        $FileEditMode
    )
    Process
    {
        $cmdStarted = Get-Date

        if ($Plan -eq $null -or $Plan.Count -eq 0)
        {
            Write-Verbose -Message "No module upgrade plan steps were provided. No upgrade will be executed."
            return
        }

        if ($FileEditMode -eq [EditMode]::ModifyExistingFiles)
        {
            if (($PSCmdlet.ShouldProcess("$($Plan.Count) module upgrade steps will be executed and existing PowerShell files will be modified in place. This action is not reversable.")) -eq $false)
            {
                Write-Verbose -Message "ShouldProcess:ModifyExistingFiles was not confirmed. Exiting command."
                return
            }
        }
        elseif ($FileEditMode -eq [EditMode]::SaveChangesToNewFiles)
        {
            if (($PSCmdlet.ShouldProcess("$($Plan.Count) module upgrade steps will be executed and new PowerShell files will be created next to the original files. Original files will not be modified.")) -eq $false)
            {
                Write-Verbose -Message "ShouldProcess:SaveChangesToNewFiles was not confirmed. Exiting command."
                return
            }
        }
        else
        {
            throw "Unexpected EditMode option was provided: $FileEditMode"
        }

        $currentFile = $null
        $currentFileContents = $null

        $successFileUpdateCount = 0
        $successCommandUpdateCount = 0
        $failedFileUpdateCount = 0
        $failedCommandUpdateCount = 0

        $fileBatchResults = New-Object -TypeName 'System.Collections.Generic.List[UpgradeResult]'

        for ([int]$i = 0; $i -lt $Plan.Count; $i++)
        {
            $upgradeStep = $Plan[$i]
            $resetFileBuilder = $false

            $result = New-Object -TypeName UpgradeResult -ArgumentList $upgradeStep
            $fileBatchResults.Add($result)

            try
            {
                if ($currentFile -eq $null)
                {
                    Write-Verbose -Message ("[{0}] Reading file contents." -f $upgradeStep.FullPath)

                    $currentFile = $upgradeStep.FullPath
                    $fileContents = Get-Content -Path $currentFile -Raw
                    $currentFileContents = New-Object -TypeName System.Text.StringBuilder -ArgumentList $fileContents
                }

                if ($upgradeStep.PlanSeverity -ne [DiagnosticSeverity]::Error)
                {
                    Invoke-ModuleUpgradeStep -Step $upgradeStep -FileContent $currentFileContents
                }
                else
                {
                    Write-Verbose -Message ("[{0}] Skipping {1} {2} due to error: {2}." -f `
                            $upgradeStep.Location, $upgradeStep.UpgradeType, `
                            $upgradeStep.Original, $upgradeStep.PlanResult)

                    $result.UpgradeResult = [UpgradeResultReasonCode]::UnableToUpgrade
                    $result.UpgradeSeverity = [DiagnosticSeverity]::Error
                    $result.UpgradeResultReason = $upgradeStep.PlanResultReason
                }

                # on the final upgrade step? or the next step is a different file?
                # then write/close the currently in-process file.

                if ($i -eq ($Plan.Count - 1) -or ($Plan[($i + 1)].FullPath) -ne $currentFile)
                {
                    if ($FileEditMode -eq [EditMode]::SaveChangesToNewFiles)
                    {
                        # save to new file adjacent to the current one.
                        $newFilePath = New-ModifiedFileName -Path $upgradeStep.FullPath
                        Write-Verbose -Message ("[{0}] Saving file contents to new file: {1}." -f $upgradeStep.FullPath, $newFilePath)
                        Set-Content -Path $newFilePath -Value $currentFileContents.ToString()
                    }
                    elseif ($FileEditMode -eq [EditMode]::ModifyExistingFiles)
                    {
                        # overwrite the existing file.
                        Write-Verbose -Message ("[{0}] Saving file contents in place." -f $upgradeStep.FullPath)
                        Set-Content -Path $currentFile -Value $currentFileContents.ToString()
                    }

                    Out-FileBatchResult -ResultBatch $fileBatchResults -Success $true -Reason "Completed successfully."
                    $resetFileBuilder = $true
                    $successFileUpdateCount++
                    $successCommandUpdateCount += $fileBatchResults.Count
                }
            }
            catch
            {
                Out-FileBatchResult -ResultBatch $fileBatchResults -Success $false -Reason "A general error has occurred: $_"
                $resetFileBuilder = $true
                $failedFileUpdateCount++
                $failedCommandUpdateCount += $fileBatchResults.Count
            }
            finally
            {
                if ($resetFileBuilder -eq $true)
                {
                    $currentFile = $null
                    $currentFileContents = $null
                    $fileBatchResults.Clear()
                }
            }
        }

        Send-MetricsIfDataCollectionEnabled -Operation Upgrade `
            -ParameterSetName $PSCmdlet.ParameterSetName `
            -Duration ((Get-Date) - $cmdStarted) `
            -Properties ([PSCustomObject]@{
                FileEditMode = ($FileEditMode.ToString())
                SuccessFileUpdateCount = $successFileUpdateCount
                SuccessCommandUpdateCount = $successCommandUpdateCount
                FailedFileUpdateCount = $failedFileUpdateCount
                FailedCommandUpdateCount = $failedCommandUpdateCount
            })
    }
}