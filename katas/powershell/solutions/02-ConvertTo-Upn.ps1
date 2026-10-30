function ConvertTo-Upn {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$GivenName,
        [Parameter(Mandatory)][string]$Surname,
        [string]$Domain = 'datacenterunited.com'
    )
    $parts = foreach ($name in $GivenName, $Surname) {
        $decomposed = $name.Normalize([Text.NormalizationForm]::FormD)
        $plain = -join ($decomposed.ToCharArray() | Where-Object {
            [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne [Globalization.UnicodeCategory]::NonSpacingMark
        })
        $plain.ToLowerInvariant() -replace '[^a-z0-9]', ''
    }
    '{0}.{1}@{2}' -f $parts[0], $parts[1], $Domain.ToLowerInvariant()
}
