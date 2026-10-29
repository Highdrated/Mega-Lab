const fs=require('fs');const f=process.argv[2];let b;global.POCKET={register:x=>b=x};
eval(fs.readFileSync(f,'utf8'));const err=[];if(!b)throw 'no register';
for(const k of ['id','name','topic','href','keys','units','done','sample','sampleDone','cards'])if(b[k]==null)err.push('missing '+k);
const ids=new Set(b.units.map(u=>u.id));if(ids.size!==b.units.length)err.push('dup unit ids');
const TY={fill:c=>Array.isArray(c.o)&&Array.isArray(c.ok)&&c.ok.length&&c.ok.every(k=>k>=0&&k<c.o.length)&&c.ok.length<c.o.length&&c.code.includes('___'),
build:c=>Array.isArray(c.tiles)&&c.ok.includes(c.sol),order:c=>Array.isArray(c.lines)&&c.ok.includes(c.sol)&&c.sol.split(',').length===c.lines.length,
bug:c=>Array.isArray(c.lines)&&c.bad>=0&&c.bad<c.lines.length&&!!c.fix,trace:c=>c.rows.length*c.cols.length===c.opts.length&&c.opts.every((o,k)=>o.includes(c.rows[Math.floor(k/c.cols.length)][k%c.cols.length]))};
const per={};b.cards.forEach((c,i)=>{if(!ids.has(c.u))err.push(i+' bad unit '+c.u);
if(c.t){if(!TY[c.t])err.push(i+' unknown type '+c.t);else if(!TY[c.t](c))err.push(i+' bad '+c.t);if(!c.why)err.push(i+' why');}else{
if(!Array.isArray(c.o)||c.o.length<2||c.o.length>4)err.push(i+' options');
if(!(c.a>=0&&c.a<c.o.length))err.push(i+' answer idx');if(new Set(c.o).size!==c.o.length)err.push(i+' dup opts');if(!c.q||!c.why)err.push(i+' q/why');}
const t=JSON.stringify(c);if(/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(t))err.push(i+' emoji');per[c.u]=(per[c.u]||0)+1;});
b.units.forEach(u=>{if(!per[u.id])err.push('no cards for '+u.id)});
const get=k=>{const v=b.sample[k];if(v==null)return null;try{return JSON.parse(v)}catch(e){return v}};
const d=b.done(get);if(JSON.stringify([...d].sort())!==JSON.stringify([...b.sampleDone].sort()))err.push('done(sample)='+JSON.stringify(d));
if(JSON.stringify(b.done(()=>null))!=='[]')err.push('done(empty) not []');
const cnt=b.cards.filter(c=>!c.t).map(c=>c.a);console.log(b.id,'units',b.units.length,'cards',b.cards.length,'answer spread',[0,1,2,3].map(i=>cnt.filter(x=>x===i).length));
console.log(err.length?'ERRORS\n'+err.join('\n'):'OK');
