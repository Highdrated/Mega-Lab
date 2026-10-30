BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '05-Compare-DlMembership.ps1')
}

Describe 'Compare-DlMembership' {
    BeforeAll {
        function Format-Plan($plan) { ($plan | ForEach-Object { '{0}:{1}' -f $_.Action, $_.Address }) -join ',' }
    }
    It 'lists who to add and who to remove' {
        $plan = Compare-DlMembership -Desired 'ann@dcu.be', 'bob@dcu.be' -Current 'ann@dcu.be', 'carl@dcu.be'
        Format-Plan $plan | Should -Be 'Add:bob@dcu.be,Remove:carl@dcu.be'
    }
    It 'ignores case and stray spaces' {
        $plan = Compare-DlMembership -Desired 'Ann@DCU.be', ' bob@dcu.be ' -Current 'ann@dcu.be', 'bob@dcu.be'
        @($plan).Count | Should -Be 0
    }
    It 'ignores blank lines' {
        $plan = Compare-DlMembership -Desired 'ann@dcu.be', '', '  ' -Current 'ann@dcu.be'
        @($plan).Count | Should -Be 0
    }
    It 'adds everyone to an empty list' {
        $plan = Compare-DlMembership -Desired 'b@dcu.be', 'a@dcu.be' -Current @()
        Format-Plan $plan | Should -Be 'Add:a@dcu.be,Add:b@dcu.be'
    }
    It 'outputs objects with Address and Action' {
        $plan = Compare-DlMembership -Desired 'x@dcu.be' -Current @()
        ($plan.PSObject.Properties.Name -join ',') | Should -Be 'Address,Action'
    }
}
