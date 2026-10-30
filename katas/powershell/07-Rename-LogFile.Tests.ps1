BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '07-Rename-LogFile.ps1')
}

Describe 'Rename-LogFile' {
    BeforeEach {
        $dir = Join-Path $TestDrive ([guid]::NewGuid().ToString())
        New-Item -ItemType Directory -Path $dir | Out-Null
        foreach ($name in 'a.log', 'b.log', 'x_c.log', 'notes.txt') {
            New-Item -ItemType File -Path (Join-Path $dir $name) | Out-Null
        }
    }
    It 'adds the prefix to every .log file' {
        Rename-LogFile -Path $dir -Prefix 'x_' | Out-Null
        ((Get-ChildItem -LiteralPath $dir).Name | Sort-Object) -join ',' | Should -Be 'notes.txt,x_a.log,x_b.log,x_c.log'
    }
    It 'returns the new names' {
        (Rename-LogFile -Path $dir -Prefix 'x_') -join ',' | Should -Be 'x_a.log,x_b.log'
    }
    It 'skips files that already have the prefix' {
        (Rename-LogFile -Path $dir -Prefix 'x_') | Should -Not -Contain 'x_x_c.log'
    }
    It 'changes nothing with -WhatIf' {
        Rename-LogFile -Path $dir -Prefix 'x_' -WhatIf | Out-Null
        ((Get-ChildItem -LiteralPath $dir).Name | Sort-Object) -join ',' | Should -Be 'a.log,b.log,notes.txt,x_c.log'
    }
}
