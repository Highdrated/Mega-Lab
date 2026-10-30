# PowerShell katas

Small real-world functions you write yourself in VS Code. Each one has Pester tests,
so real PowerShell tells you green or red. The task text for each kata is in the
Mega Lab under **Poshle Forge > Katas**.

## One-time setup (Mac)

```
brew install --cask powershell
pwsh
Install-Module Pester -MinimumVersion 5.5 -Scope CurrentUser -Force -SkipPublisherCheck
```

Get the files: `git clone https://github.com/Highdrated/Mega-Lab.git` (or `git pull` if you already have it).

## Do a kata

```
cd Mega-Lab/katas/powershell
code 01-New-MailNickname.ps1
pwsh -c "Invoke-Pester ./01-New-MailNickname.Tests.ps1 -Output Detailed"
```

1. Open the kata's `.ps1` file and replace `throw 'Not done yet'` with your code.
2. Run its tests. Red means a test failed: read what it expected.
3. Repeat until everything is green.

Run every kata at once: `Invoke-Pester .`

## Stuck?

`solutions/` has one working answer per kata. Try for at least 20 minutes first.
Check the official answers against the tests with:

```
$env:KATA_SOLUTIONS = 1; Invoke-Pester .; Remove-Item Env:KATA_SOLUTIONS
```

## The katas

| # | Function | You practise |
|---|---|---|
| 01 | New-MailNickname | Substring, Trim, -replace |
| 02 | ConvertTo-Upn | removing accents, -f format, default parameters |
| 03 | Get-LicenseSummary | Group-Object, Sort-Object, custom objects |
| 04 | Get-StaleAccount | pipeline input, begin/process, dates |
| 05 | Compare-DlMembership | comparing lists, -notin, clean input |
| 06 | Import-SiteList | Test-Path, throw, Import-Csv, type casting |
| 07 | Rename-LogFile | SupportsShouldProcess, -WhatIf |
| 08 | ConvertTo-ByteCount | regex, $Matches, Exchange size strings |
