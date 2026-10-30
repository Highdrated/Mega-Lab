function ConvertTo-ByteCount {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, ValueFromPipeline)][string]$Size
    )
    process {
        if ($Size -match '\(([\d,\.]+) bytes\)') {
            [long]($Matches[1] -replace '[,\.]', '')
        }
        else {
            throw "Cannot parse size: $Size"
        }
    }
}
