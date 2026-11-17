const PS=require('./engine.js'); const G=require('./grader.js'); const {MEMORIES}=require('./content.node.js');
let fail=0;
for(const m of MEMORIES.filter(m=>m.seq>=2)){
  const wctx=G.makeCtx(m.setup); const werr=[];
  for(const w of m.watch){const r=PS.run(w.code,wctx); if(r.error) werr.push(r.error.text().split('\n')[0].slice(0,100));}
  const sol=m.recallHints[3].split(/, then /);
  const rc=G.makeCtx(m.recall.setup,m.recall.pre); let ok=false,hist=[],errs=[];
  for(const s of sol){hist.push(s);const r=PS.run(s,rc); if(r.error) errs.push(r.error.text().slice(0,100)); if(G.verdict(m.recall.check,m.recall.setup,rc,r,hist,m.recall.pre)) ok=true;}
  const c0=G.makeCtx(m.recall.setup,m.recall.pre); const pre=G.verdict(m.recall.check,m.recall.setup,c0,PS.run('$null',c0),[],m.recall.pre);
  const tctx=G.makeCtx(m.trace.setup||m.setup); const tpre=G.verdict(m.trace.check,m.trace.setup||m.setup,tctx,PS.run('$null',tctx));
  console.log(m.id.padEnd(11),'recall',ok,'prepass',pre,'tracePrepass',tpre,'watchErrs',JSON.stringify(werr),errs.length?errs:'');
  if(!ok||pre||tpre) fail++;
}
console.log('FAIL',fail);
