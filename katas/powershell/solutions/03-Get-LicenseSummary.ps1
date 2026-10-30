function Get-LicenseSummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][object[]]$User
    )
    $User |
        ForEach-Object { $_.Licenses } |
        Where-Object { $_ } |
        Group-Object |
        Sort-Object @{ Expression = 'Count'; Descending = $true }, Name |
        ForEach-Object { [pscustomobject]@{ Sku = $_.Name; Count = $_.Count } }
}
