#install-module azpreview

class getBreakingchangeResult{
    [System.String] $Name
    [System.String] $TypeBreakingChange
}

$results = @{
}

$results["updateTime"] = Get-Date
$results["func"] = @()
$results["cmdlet"] = @()
$results["para_func"] = @()
$results["para_cmdlet"] = @()

$az_modules = gmo az.* -ListAvailable | Where-object {$_.Name -ne "Az.Tools.Migration"}

for ([int]$i = 0; $i -lt $az_modules.Count; $i++){

    
    import-module $az_modules[$i].name
    $module = get-module $az_modules[$i].name

    $exportedFunctions = $module.ExportedFunctions
    $exportedCmdlets = $module.ExportedCmdlets


    foreach ($key in $exportedFunctions.Keys){
        $func = $exportedFunctions[$key]
        
        #attributes of functions
        foreach ($Attribute in $func.ScriptBlock.Attributes){
            
            if ($Attribute.TypeId.BaseType.Name -eq "GenericBreakingChangeAttribute"  -or $Attribute.TypeId.Name -eq "GenericBreakingChangeAttribute"){
                #$Attribute.TypeId.Name
                $result = New-Object -TypeName getBreakingchangeResult
                    $result.Name = $func.name
                    $result.TypeBreakingChange = $Attribute.TypeId.FullName
                $results["func"] += $result
            }
        }

        #attributes of parameters in function
        foreach ($parameter_key in $func.Parameters.keys){
            $parameter = $func.Parameters[$parameter_key]
            for ([int]$k = 0; $k -lt $parameter.Attributes.Count; $k++){
                $Attribute = $parameter.Attributes[$k]
                if ($Attribute.TypeId.BaseType.Name -eq "GenericBreakingChangeAttribute" -or $Attribute.TypeId.Name -eq "GenericBreakingChangeAttribute"){
                    #$Attribute.TypeId.Name
                    $result = New-Object -TypeName getBreakingchangeResult
                    $result.Name = $parameter_key
                    $result.TypeBreakingChange = $Attribute.TypeId.FullName
                    $results["para_func"] += $result
                }
            }
        }
    }

    foreach ($key in $exportedCmdlets.Keys){
        $Cmdlet = $exportedCmdlets[$key]

        #attributes of cmdlets
        foreach ($Attribute in $Cmdlet.ImplementingType.CustomAttributes){
           if ($Attribute.AttributeType.BaseType.Name -eq "GenericBreakingChangeAttribute" -or $Attribute.AttributeType.Name -eq "GenericBreakingChangeAttribute"){
                #$Attribute.AttributeType.Name
                $result = New-Object -TypeName getBreakingchangeResult
                $result.Name = $Cmdlet.Name
                $result.TypeBreakingChange = $Attribute.AttributeType.FullName
                $results["cmdlet"] += $result
            }
        }

        #attributes of parameters in cmdlet
        foreach ($parameter_key in $Cmdlet.Parameters.keys){
            $parameter = $Cmdlet.Parameters[$parameter_key]
            for ([int]$k = 0; $k -lt $parameter.Attributes.Count; $k++){
                $Attribute = $parameter.Attributes[$k]
                if ($Attribute.TypeId.BaseType.Name -eq "GenericBreakingChangeAttribute" -or $Attribute.TypeId.Name -eq "GenericBreakingChangeAttribute"){
                    # $Attribute.TypeId.Name
                    $result = New-Object -TypeName getBreakingchangeResult
                    $result.Name = $parameter_key
                    $result.TypeBreakingChange = $Attribute.TypeId.FullName
                    $results["para_cmdlet"] += $result
                }
            }
        }


    }
    


}
# foreach ($key in $results.Keys){
#     $results[$key].Count
# }
$json = $results | ConvertTo-Json
$json > breakingchange.json


