const real = Date.now; let skew = 0; const RD = Date;
global.Date = class extends RD { constructor(...a) { if (a.length === 0) super(real() + skew); else super(...a); } static now() { return real() + skew; } };
const PS = require('./engine.js'); const G = require('./grader.js'); const { MEMORIES, DRILLS } = require('./content.node.js');
let fail = 0, n = 0;
for (const m of MEMORIES) {
  (DRILLS[m.id] || []).forEach((d, i) => {
    n++;
    const setup = d.setup || m.recall.setup; const chk = G.drillCheck(d);
    skew = 0; const c1 = G.makeCtx(setup, d.pre); const hist = []; let ok = false, last;
    skew = 150000;
    for (const s of (d.sol || [d.out])) { hist.push(s); last = PS.run(s, c1); if (G.verdict(chk, setup, c1, last, hist, d.pre)) ok = true; }
    if (!ok) { fail++; console.log('FAIL', m.id, i, d.q.slice(0, 60)); }
  });
}
console.log('slow typist drills', n, 'FAIL', fail);
