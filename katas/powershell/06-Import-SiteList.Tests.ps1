BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '06-Import-SiteList.ps1')
}

Describe 'Import-SiteList' {
    BeforeAll {
        $good = Join-Path $TestDrive 'sites.csv'
        Set-Content -LiteralPath $good -Value @('Site,Racks,Region', 'OOST1,40,west', 'ANTW2,12,north')
        $bad = Join-Path $TestDrive 'broken.csv'
        Set-Content -LiteralPath $bad -Value @('Site,Region', 'OOST1,west')
    }
    It 'reads every row' {
        @(Import-SiteList -Path $good).Count | Should -Be 2
    }
    It 'turns Racks into a number' {
        $first = Import-SiteList -Path $good | Select-Object -First 1
        $first.Racks | Should -BeOfType [int]
        $first.Racks | Should -Be 40
    }
    It 'writes Region in capitals' {
        (Import-SiteList -Path $good).Region -join ',' | Should -BeExactly 'WEST,NORTH'
    }
    It 'throws a clear error when the file is missing' {
        { Import-SiteList -Path (Join-Path $TestDrive 'nope.csv') } | Should -Throw 'Site list not found*'
    }
    It 'throws a clear error when a column is missing' {
        { Import-SiteList -Path $bad } | Should -Throw 'Missing column: Racks'
    }
}
