function Import-SiteList {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Path
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Site list not found: $Path"
    }
    $header = (Get-Content -LiteralPath $Path -TotalCount 1) -split ',' | ForEach-Object { $_.Trim() }
    foreach ($column in 'Site', 'Racks', 'Region') {
        if ($column -notin $header) { throw "Missing column: $column" }
    }
    Import-Csv -LiteralPath $Path | ForEach-Object {
        [pscustomobject]@{
            Site   = $_.Site
            Racks  = [int]$_.Racks
            Region = $_.Region.ToUpperInvariant()
        }
    }
}
