BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '03-Get-LicenseSummary.ps1')
}

Describe 'Get-LicenseSummary' {
    BeforeAll {
        $users = @(
            [pscustomobject]@{ Name = 'a'; Licenses = @('E3', 'Teams') }
            [pscustomobject]@{ Name = 'b'; Licenses = @('E3') }
            [pscustomobject]@{ Name = 'c'; Licenses = @() }
            [pscustomobject]@{ Name = 'd'; Licenses = @('F3', 'Teams', 'E3') }
        )
        $result = @(Get-LicenseSummary -User $users)
    }
    It 'returns one row per licence' {
        $result.Count | Should -Be 3
    }
    It 'has exactly the columns Sku and Count' {
        ($result[0].PSObject.Properties.Name -join ',') | Should -Be 'Sku,Count'
    }
    It 'puts the most used licence first' {
        $result[0].Sku | Should -Be 'E3'
        $result[0].Count | Should -Be 3
    }
    It 'sorts by count, then by name' {
        ($result | ForEach-Object { '{0}={1}' -f $_.Sku, $_.Count }) -join ',' | Should -Be 'E3=3,Teams=2,F3=1'
    }
}
