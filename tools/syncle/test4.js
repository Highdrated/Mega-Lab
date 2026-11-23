const PS=require('./engine.js');const G=require('./grader.js');const {BREAKS}=require('./content.node.js');
const D='halvardco.onmicrosoft.com';
const SOL={
 'b-locked':[['Connect-MgGraph -Scopes User.Read.All -NoWelcome'],['Get-MgUser -UserId elara.wynn@'+D+' -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled',0],['Connect-MgGraph -Scopes User.ReadWrite.All -NoWelcome'],['Update-MgUser -UserId elara.wynn@'+D+' -AccountEnabled:$true',1],['Get-MgUser -UserId elara.wynn@'+D+' -Property DisplayName,AccountEnabled | Select-Object DisplayName,AccountEnabled',2]],
 'b-forward':[['Connect-ExchangeOnline -ShowBanner:$false'],['Get-EXOMailbox -Identity Support -Properties ForwardingSmtpAddress,DeliverToMailboxAndForward | Select-Object DisplayName,ForwardingSmtpAddress,DeliverToMailboxAndForward',0],['Set-Mailbox -Identity Support -ForwardingSmtpAddress $null',1]],
 'b-fullaccess':[['Connect-ExchangeOnline -ShowBanner:$false'],['Get-MailboxPermission -Identity "Finance Inbox"',0],['Add-MailboxPermission -Identity "Finance Inbox" -User hesper.reedmire@'+D+' -AccessRights FullAccess',1]],
 'b-dl':[['Connect-ExchangeOnline -ShowBanner:$false'],['Get-DistributionGroupMember -Identity "Sales Team"',0],['Add-DistributionGroupMember -Identity "Sales Team" -Member dorian.pikeholm@'+D,1]],
 'b-license':[['Connect-MgGraph -Scopes User.ReadWrite.All,Organization.Read.All -NoWelcome'],['Get-MgUserLicenseDetail -UserId garrion.penhale@'+D,0],["$e3 = Get-MgSubscribedSku -All | Where-Object SkuPartNumber -eq 'SPE_E3'; Set-MgUserLicense -UserId garrion.penhale@"+D+" -AddLicenses @{SkuId = $e3.SkuId} -RemoveLicenses @()",1]],
 'b-qr':[['Connect-ExchangeOnline -ShowBanner:$false'],["Get-MessageTraceV2 -Subject 'mailbox storage full' -SubjectFilterType Contains",0],["Get-MessageTraceV2 -Subject 'mailbox storage full' -SubjectFilterType Contains -Status Delivered | Select-Object RecipientAddress | Export-Csv ~/Desktop/qr-wave.csv -NoTypeInformation -Delimiter ';'",1],['Connect-MgGraph -Scopes AuditLog.Read.All -NoWelcome'],["$to = Get-MessageTraceV2 -Subject 'mailbox storage full' -SubjectFilterType Contains -Status Delivered | Select-Object -ExpandProperty RecipientAddress; foreach ($r in $to) { Get-MgAuditLogSignIn -Filter \"userPrincipalName eq '$r' and status/errorCode eq 0 and location/countryOrRegion ne 'BE'\" }",2]]
};
let fail=0;
for(const b of BREAKS){const c=G.makeCtx('none');b.mutate(c);const hist=[];
 const pre=b.tickets.map(t=>{try{return t.check(c,hist,null)}catch(e){return false}});
 if(pre.some(Boolean)){fail++;console.log(b.id,'PREPASS',pre);}
 const got=[];
 for(const [cmd,ti] of SOL[b.id]){hist.push(cmd);const r=PS.run(cmd,c);if(r.error)console.log(b.id,'ERR',r.error.text().slice(0,150));if(ti!==undefined)got.push(b.tickets[ti].check(c,hist,r));}
 if(!got.every(Boolean)||got.length!==b.tickets.length){fail++;console.log(b.id,got);}
}
console.log('breaks',BREAKS.length,'FAIL',fail);
