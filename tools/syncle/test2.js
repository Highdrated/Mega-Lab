const PS=require('./engine.js'); const G=require('./grader.js'); const {MEMORIES,DRILLS}=require('./content.node.js');
let fail=0,n=0;
for(const m of MEMORIES){
  const ds=DRILLS[m.id]||[]; if(!ds.length){console.log('NO DRILLS',m.id);fail++;}
  ds.forEach((d,i)=>{
    n++;
    const setup=d.setup||m.recall.setup; const chk=G.drillCheck(d);
    const c0=G.makeCtx(setup,d.pre); const r0=PS.run('$null',c0); const pre=G.verdict(chk,setup,c0,r0,[],d.pre);
    const c1=G.makeCtx(setup,d.pre); const hist=[]; let ok=false,last; const errs=[];
    for(const s of (d.sol||[d.out])){hist.push(s); last=PS.run(s,c1); if(last.error) errs.push(last.error.text().slice(0,90)); if(G.verdict(chk,setup,c1,last,hist,d.pre)) ok=true;}
    if(!ok||pre){fail++;console.log('FAIL',m.id,i,'ok',ok,'prepass',pre,d.q.slice(0,60),errs);}
  });
  // memory trace/recall
  const ts=m.trace.setup||m.setup; const tctx=G.makeCtx(ts,m.trace.pre); let tr=PS.run(G.fillTpl(m.trace.tpl,G.gapsOf(m.trace.tpl)),tctx); for(const a of (m.trace.after||[])){const r2=PS.run(a,tctx); if(r2.error) tr=r2;}
  if(!G.verdict(m.trace.check,ts,tctx,tr,[],m.trace.pre)){fail++;console.log('TRACE FAIL',m.id,tr.error&&tr.error.text());}
  const h4=m.recallHints[3]; 
  for(const w of m.watch){}
  const wctx=G.makeCtx(m.setup); for(const w of m.watch){const r=PS.run(w.code,wctx);}
}
console.log('drills',n,'FAIL',fail);
