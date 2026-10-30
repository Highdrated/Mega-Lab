function New-MailNickname {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$GivenName,
        [Parameter(Mandatory)][string]$Surname
    )
    $g = $GivenName.Trim()
    $s = $Surname -replace '\s', ''
    $take = [Math]::Min(2, $s.Length)
    ($g.Substring(0, 1) + $s.Substring(0, $take)).ToLowerInvariant()
}
