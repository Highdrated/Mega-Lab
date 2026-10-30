function Get-StaleAccount {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, ValueFromPipeline)][object]$User,
        [int]$Days = 90,
        [datetime]$Now = (Get-Date)
    )
    process {
        throw 'Not done yet'
    }
}
