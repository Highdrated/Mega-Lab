function Rename-LogFile {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Prefix
    )
    Get-ChildItem -LiteralPath $Path -Filter '*.log' -File |
        Where-Object { -not $_.Name.StartsWith($Prefix) } |
        Sort-Object Name |
        ForEach-Object {
            $newName = $Prefix + $_.Name
            if ($PSCmdlet.ShouldProcess($_.Name, "Rename to $newName")) {
                Rename-Item -LiteralPath $_.FullName -NewName $newName
                $newName
            }
        }
}
