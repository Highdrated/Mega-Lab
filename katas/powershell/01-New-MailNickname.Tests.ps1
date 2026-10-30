BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '01-New-MailNickname.ps1')
}

Describe 'New-MailNickname' {
    It 'takes 1 letter of the first name and 2 of the surname' {
        New-MailNickname -GivenName 'Stijn' -Surname 'Raes' | Should -Be 'sra'
    }
    It 'returns lower case' {
        New-MailNickname -GivenName 'Kaatje' -Surname 'Nagels' | Should -BeExactly 'kna'
    }
    It 'ignores spaces inside the surname' {
        New-MailNickname -GivenName 'Jan' -Surname 'De Smet' | Should -BeExactly 'jde'
    }
    It 'trims spaces around the first name' {
        New-MailNickname -GivenName '  Stijn ' -Surname 'Raes' | Should -BeExactly 'sra'
    }
    It 'copes with a one-letter surname' {
        New-MailNickname -GivenName 'An' -Surname 'O' | Should -BeExactly 'ao'
    }
}
