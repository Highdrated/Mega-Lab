const GRADER = (() => {
  const E = typeof PS !== "undefined" ? PS : require("./engine.js");
  const C = typeof MEMORIES !== "undefined" ? { MEMORIES, GATE } : require("./content.node.js");
  function makeCtx(setup) {
    const ctx = new E.Ctx();
    if (setup === "read" || setup === "exo") E.run("Connect-MgGraph -Scopes User.Read.All -NoWelcome", ctx);
    if (setup === "write") E.run("Connect-MgGraph -Scopes User.ReadWrite.All -NoWelcome", ctx);
    if (setup === "exo") E.run("Connect-ExchangeOnline -ShowBanner:$false", ctx);
    ctx.host = [];
    return ctx;
  }
  function text(res) { return E.formatOut(res.out, 120).replace(/[ \t]+$/gm, "").trim(); }
  function refText(chk, setup) {
    const ctx = makeCtx(chk.needExo ? "exo" : setup);
    return text(E.run(chk.out, ctx));
  }
  function verdict(chk, setup, ctx, res) {
    if (!res) return false;
    if (res.error) return false;
    if (chk.fn) { try { return !!chk.fn(ctx, res); } catch (e) { return false; } }
    if (chk.out) { if (chk.needExo && !ctx.exo) return false; return text(res) === refText(chk, setup); }
    return false;
  }
  function fillTpl(tpl, vals) { let i = 0; return tpl.replace(/\[\[([^\]]*)\]\]/g, () => (vals[i++] || "")); }
  function gapsOf(tpl) { const out = []; tpl.replace(/\[\[([^\]]*)\]\]/g, (m, a) => { out.push(a); return m; }); return out; }
  return { makeCtx, verdict, text, fillTpl, gapsOf, refText };
})();
if (typeof module !== "undefined") module.exports = GRADER;
