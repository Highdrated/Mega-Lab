function Compare-DlMembership {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][AllowEmptyString()][string[]]$Desired,
        [Parameter(Mandatory)][AllowEmptyCollection()][AllowEmptyString()][string[]]$Current
    )
    $want = @($Desired | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ } | Sort-Object -Unique)
    $have = @($Current | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ } | Sort-Object -Unique)
    foreach ($address in $want) {
        if ($address -notin $have) { [pscustomobject]@{ Address = $address; Action = 'Add' } }
    }
    foreach ($address in $have) {
        if ($address -notin $want) { [pscustomobject]@{ Address = $address; Action = 'Remove' } }
    }
}
