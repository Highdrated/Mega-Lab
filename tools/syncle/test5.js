const PS=require('./engine.js');const G=require('./grader.js');const {MEMORIES,AUTOMATE}=require('./content.node.js');
const SC='/Users/veyra/Documents/scripts/';const D='halvardco.onmicrosoft.com';
const SOL={
 runscript:{files:{},cmds:['~/Documents/scripts/Get-StaleUsers.ps1']},
 firstscript:{files:{'Get-FinanceList.ps1':`Get-MgUser -All -Filter "department eq 'Finance'" -Property DisplayName,JobTitle |\n    Select-Object DisplayName,JobTitle`},cmds:['./Get-FinanceList.ps1']},
 params:{files:{'Get-CityUsers.ps1':`param(\n    [Parameter(Mandatory)]\n    [string]$City\n)\nGet-MgUser -All -Filter "city eq '$City'" -Property DisplayName,Department | Select-Object DisplayName,Department`},cmds:['./Get-CityUsers.ps1 -City Ghent']},
 functions:{files:{'Halvard-Tools.ps1':`function Get-UserCard {\n    param([string]$UserId)\n    $u = Get-MgUser -UserId $UserId -Property DisplayName,Department,City\n    [pscustomobject]@{\n        Name = $u.DisplayName\n        Department = $u.Department\n        City = $u.City\n    }\n}`},cmds:['. ./Halvard-Tools.ps1; Get-UserCard -UserId elara.wynn@'+D]},
 scripterrors:{files:{'Test-Leavers.ps1':`$ErrorActionPreference = 'Stop'\nforeach ($r in Import-Csv ~/Downloads/leavers.csv) {\n    try {\n        Get-MgUser -UserId $r.UPN | Out-Null\n        [pscustomobject]@{ Upn = $r.UPN; Found = $true }\n    }\n    catch {\n        Write-Warning "$($r.UPN): $($_.Exception.Message)"\n        [pscustomobject]@{ Upn = $r.UPN; Found = $false }\n    }\n}`},cmds:['./Test-Leavers.ps1']},
 shouldprocess:{files:{'Set-DeptCity.ps1':`[CmdletBinding(SupportsShouldProcess)]\nparam(\n    [Parameter(Mandatory)][string]$Department,\n    [Parameter(Mandatory)][string]$City\n)\nforeach ($u in Get-MgUser -All -Filter "department eq '$Department'") {\n    Write-Verbose "Updating $($u.DisplayName)"\n    Update-MgUser -UserId $u.Id -City $City\n}`},cmds:['./Set-DeptCity.ps1 -Department Finance -City Antwerp -WhatIf','./Set-DeptCity.ps1 -Department Finance -City Antwerp']}
};
let fail=0;
for(const m of MEMORIES.filter(m=>m.seq===9)){
  const s=SOL[m.id];const c=G.makeCtx(m.recall.setup);const hist=[];
  const pre=PS.run('$null',c); if(G.verdict(m.recall.check,m.recall.setup,c,pre,hist)){fail++;console.log(m.id,'PREPASS');}
  for(const [n,t] of Object.entries(s.files)) c.fs[SC+n]={text:t,at:new Date()};
  let r; for(const cmd of s.cmds){hist.push(cmd);c.host=[];r=PS.run(cmd,c);if(r.error)console.log(m.id,'ERR',r.error.text().slice(0,140));}
  const ok=G.verdict(m.recall.check,m.recall.setup,c,r,hist); if(!ok){fail++;console.log(m.id,'RECALL FAIL',PS.formatOut(r.out,100).slice(0,300));}
  const w=G.makeCtx(m.setup);const we=[];for(const st of m.watch){const x=PS.run(st.code,w);if(x.error)we.push(x.error.text().slice(0,90));}
  console.log(m.id,'ok',ok,'watchErrs',we);
}
const SYNC=`<#\n.SYNOPSIS\nAdds enabled users of a department to a distribution list.\n#>\n[CmdletBinding(SupportsShouldProcess)]\nparam(\n    [Parameter(Mandatory)][string]$Department,\n    [Parameter(Mandatory)][string]$List\n)\n$ErrorActionPreference = 'Stop'\n$have = (Get-DistributionGroupMember -Identity $List).PrimarySmtpAddress\n$users = Get-MgUser -All -Filter "department eq '$Department'" -Property UserPrincipalName,AccountEnabled\nforeach ($u in $users) {\n    if (-not $u.AccountEnabled) { continue }\n    if ($have -contains $u.UserPrincipalName) { continue }\n    try {\n        Add-DistributionGroupMember -Identity $List -Member $u.UserPrincipalName\n        Add-Content ~/Documents/scripts/sync.log -Value "$(Get-Date) added $($u.UserPrincipalName)"\n    }\n    catch { Write-Warning "$($u.UserPrincipalName): $($_.Exception.Message)" }\n}`;
const c=G.makeCtx('scripts');AUTOMATE.mutate(c);
const pre=AUTOMATE.tickets.map(t=>t.check(c,[],null));if(pre.some(Boolean)){fail++;console.log('capstone PREPASS',pre);}
c.fs[SC+'Sync-DeptList.ps1']={text:SYNC,at:new Date()};
const res=AUTOMATE.tickets.map(t=>t.check(c,[],null));console.log('capstone',res);if(!res.every(Boolean))fail++;
const bad=G.makeCtx('scripts');bad.fs[SC+'Sync-DeptList.ps1']={text:SYNC.replace(/    if \(\$have -contains[^\n]*\n/,'').replace("$ErrorActionPreference = 'Stop'\n",''),at:new Date()};console.log('capstone no-skip a4 should fail:',AUTOMATE.tickets[3].check(bad,[],null));
console.log('scripts FAIL',fail);
