BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '04-Get-StaleAccount.ps1')
}

Describe 'Get-StaleAccount' {
    BeforeAll {
        $now = [datetime]'2026-10-30'
        $users = @(
            [pscustomobject]@{ UserPrincipalName = 'a@dcu.be'; Enabled = $true;  LastSignIn = [datetime]'2026-10-01' }
            [pscustomobject]@{ UserPrincipalName = 'b@dcu.be'; Enabled = $true;  LastSignIn = [datetime]'2026-06-01' }
            [pscustomobject]@{ UserPrincipalName = 'c@dcu.be'; Enabled = $true;  LastSignIn = $null }
            [pscustomobject]@{ UserPrincipalName = 'd@dcu.be'; Enabled = $false; LastSignIn = [datetime]'2025-01-01' }
            [pscustomobject]@{ UserPrincipalName = 'e@dcu.be'; Enabled = $true;  LastSignIn = [datetime]'2026-08-01' }
        )
    }
    It 'finds enabled accounts older than 90 days, and ones that never signed in' {
        (($users | Get-StaleAccount -Now $now).UserPrincipalName) -join ',' | Should -Be 'b@dcu.be,c@dcu.be'
    }
    It 'does not count a sign-in exactly on the cutoff day as stale' {
        ($users | Get-StaleAccount -Now $now).UserPrincipalName | Should -Not -Contain 'e@dcu.be'
    }
    It 'skips disabled accounts' {
        ($users | Get-StaleAccount -Now $now).UserPrincipalName | Should -Not -Contain 'd@dcu.be'
    }
    It 'respects -Days' {
        (($users | Get-StaleAccount -Now $now -Days 365).UserPrincipalName) -join ',' | Should -Be 'c@dcu.be'
    }
    It 'also works without the pipeline' {
        (Get-StaleAccount -User $users[2] -Now $now).UserPrincipalName | Should -Be 'c@dcu.be'
    }
    It 'returns the original objects' {
        $first = $users | Get-StaleAccount -Now $now | Select-Object -First 1
        [object]::ReferenceEquals($first, $users[1]) | Should -BeTrue
    }
}
