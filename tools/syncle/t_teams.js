const PS=require('./engine.js'); const G=require('./grader.js'); const C=require('./content.node.js');
let fail=0;
for (const m of C.MEMORIES.filter(m=>m.seq===11)) {
  const w=G.makeCtx(m.setup); m.watch.forEach((s,i)=>{const r=PS.run(s.code,w); if(r.error) console.log('  watch err',m.id,i,r.error.text().split('\n').slice(-1)[0].slice(0,90));});
  const ok=(code)=>{const c=G.makeCtx(m.recall.setup); const r=PS.run(code,c); return G.verdict(m.recall.check,m.recall.setup,c,r,[code],null);};
  const good=ok(m.recallHints[3]), blank=ok('$null');
  const ts=m.trace.setup||m.setup; const tc=G.makeCtx(ts,m.trace.pre); const tr=PS.run(G.fillTpl(m.trace.tpl,G.gapsOf(m.trace.tpl)),tc); const tOK=G.verdict(m.trace.check,ts,tc,tr,[],m.trace.pre);
  const tc2=G.makeCtx(ts,m.trace.pre); const tr2=PS.run(G.fillTpl(m.trace.tpl,G.gapsOf(m.trace.tpl).map(()=>'x')),tc2); const tBad=G.verdict(m.trace.check,ts,tc2,tr2,[],m.trace.pre);
  console.log(m.id,'recall',good,'blank',blank,'trace',tOK,'traceWrong',tBad);
  if(!good||blank||!tOK||tBad) fail++;
}
const S=C.SPRING; const c=G.makeCtx(S.setup);
const sol=[
 "Get-Team -DisplayName 'Summer Party 2025' | Set-TeamArchivedState -Archived:$true -SetSpoSiteReadOnlyForMembers:$true",
 "$t = Get-Team -DisplayName 'Finance Close'; Add-TeamUser -GroupId $t.GroupId -User hesper.reedmire@halvardco.onmicrosoft.com -Role Owner; Add-TeamUser -GroupId $t.GroupId -User ysolde.marrow@halvardco.onmicrosoft.com -Role Owner; Remove-TeamUser -GroupId $t.GroupId -User fenna.lowmere@halvardco.onmicrosoft.com",
 "New-Team -DisplayName 'Zeebrugge Depot' -Visibility Private -Owner caius.merrowind@halvardco.onmicrosoft.com; $t = Get-Team -DisplayName 'Zeebrugge Depot'; Get-MgUser -All -Filter \"department eq 'Operations' and city eq 'Ghent'\" -Property UserPrincipalName,AccountEnabled | Where-Object AccountEnabled | ForEach-Object { Add-TeamUser -GroupId $t.GroupId -User $_.UserPrincipalName }; New-TeamChannel -GroupId $t.GroupId -DisplayName 'Shift leads' -MembershipType Private -Owner caius.merrowind@halvardco.onmicrosoft.com; Add-TeamChannelUser -GroupId $t.GroupId -DisplayName 'Shift leads' -User torin.ash@halvardco.onmicrosoft.com",
 "Get-Team | Select-Object DisplayName,Archived,@{n='Owners';e={(Get-TeamUser -GroupId $_.GroupId -Role Owner).Count}} | Export-Csv ~/Desktop/teams-owners.csv -Delimiter ';' -NoTypeInformation"];
S.tickets.forEach((t,i)=>{const pre=t.check(c); const r=PS.run(sol[i],c); const post=t.check(c); console.log('cap',t.id,'before',pre,'after',post,r.error?r.error.text().slice(0,120):''); if(pre||!post) fail++;});
console.log('FAIL',fail);
