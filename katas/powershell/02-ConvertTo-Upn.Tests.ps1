BeforeAll {
    $kataDir = if ($env:KATA_SOLUTIONS) { Join-Path $PSScriptRoot 'solutions' } else { $PSScriptRoot }
    . (Join-Path $kataDir '02-ConvertTo-Upn.ps1')
}

Describe 'ConvertTo-Upn' {
    It 'builds first.last@domain in lower case' {
        ConvertTo-Upn -GivenName 'Stijn' -Surname 'Raes' | Should -BeExactly 'stijn.raes@datacenterunited.com'
    }
    It 'removes accents' {
        ConvertTo-Upn -GivenName 'Zoë' -Surname 'Peeters' | Should -BeExactly 'zoe.peeters@datacenterunited.com'
    }
    It 'removes spaces and accents from long surnames' {
        ConvertTo-Upn -GivenName 'Émile' -Surname 'Van den Broeck' | Should -BeExactly 'emile.vandenbroeck@datacenterunited.com'
    }
    It 'removes apostrophes' {
        ConvertTo-Upn -GivenName 'Lies' -Surname "D'Hondt" | Should -BeExactly 'lies.dhondt@datacenterunited.com'
    }
    It 'uses another domain when asked' {
        ConvertTo-Upn -GivenName 'Noor' -Surname 'Haddad' -Domain 'Contoso.com' | Should -BeExactly 'noor.haddad@contoso.com'
    }
}
