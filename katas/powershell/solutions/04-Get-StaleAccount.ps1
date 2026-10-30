function Get-StaleAccount {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, ValueFromPipeline)][object]$User,
        [int]$Days = 90,
        [datetime]$Now = (Get-Date)
    )
    begin {
        $cutoff = $Now.AddDays(-$Days)
    }
    process {
        if ($User.Enabled -and (-not $User.LastSignIn -or $User.LastSignIn -lt $cutoff)) {
            $User
        }
    }
}
