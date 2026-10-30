BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '08-ConvertTo-ByteCount.ps1')
}

Describe 'ConvertTo-ByteCount' {
    It 'reads the byte count from an Exchange size string' {
        ConvertTo-ByteCount -Size '1.234 GB (1,325,000,000 bytes)' | Should -Be 1325000000
    }
    It 'returns a whole number' {
        ConvertTo-ByteCount -Size '512 KB (524,288 bytes)' | Should -BeOfType [long]
    }
    It 'handles an empty mailbox' {
        ConvertTo-ByteCount -Size '0 B (0 bytes)' | Should -Be 0
    }
    It 'handles dots as thousand separators' {
        ConvertTo-ByteCount -Size '1,5 MB (1.572.864 bytes)' | Should -Be 1572864
    }
    It 'works in the pipeline' {
        ('1 KB (1,024 bytes)', '2 KB (2,048 bytes)' | ConvertTo-ByteCount | Measure-Object -Sum).Sum | Should -Be 3072
    }
    It 'throws a clear error on text it cannot read' {
        { ConvertTo-ByteCount -Size 'Unlimited' } | Should -Throw 'Cannot parse size: Unlimited'
    }
}
