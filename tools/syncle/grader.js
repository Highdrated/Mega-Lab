const GRADER = (() => {
  const E = typeof PS !== "undefined" ? PS : require("./engine.js");
  const SETUPS = {
    none: { scopes: [], exo: false },
    read: { scopes: ["User.Read.All"], exo: false },
    write: { scopes: ["User.ReadWrite.All"], exo: false },
    exo: { scopes: ["User.Read.All"], exo: true },
    groups: { scopes: ["User.Read.All", "Group.Read.All"], exo: false },
    groupsW: { scopes: ["User.Read.All", "Group.ReadWrite.All"], exo: false },
    lic: { scopes: ["User.Read.All", "Organization.Read.All"], exo: false },
    licW: { scopes: ["User.ReadWrite.All", "Organization.Read.All"], exo: false },
    reports: { scopes: ["User.Read.All", "Organization.Read.All", "AuditLog.Read.All"], exo: false, cwd: "/Users/kaatje/Desktop" },
    bulk: { scopes: ["User.ReadWrite.All", "Organization.Read.All"], exo: false, cwd: "/Users/kaatje/Downloads" },
    inv: { scopes: ["User.Read.All", "AuditLog.Read.All", "UserAuthenticationMethod.Read.All", "Group.Read.All"], exo: true, cwd: "/Users/kaatje/Desktop" },
    resp: { scopes: ["User.ReadWrite.All", "AuditLog.Read.All", "UserAuthenticationMethod.ReadWrite.All", "Group.ReadWrite.All"], exo: true, cwd: "/Users/kaatje/Desktop" }
  };
  const HOOKS = [];
  function makeCtx(setup, pre) {
    const s = SETUPS[setup] || SETUPS.none;
    const ctx = new E.Ctx();
    if (s.scopes.length) E.run("Connect-MgGraph -Scopes " + s.scopes.join(",") + " -NoWelcome", ctx);
    if (s.exo) E.run("Connect-ExchangeOnline -ShowBanner:$false", ctx);
    if (s.cwd) { ctx.cwd = s.cwd; ctx.prevCwd = "/Users/kaatje"; }
    if (s.contractors) E.seedContractors(ctx, s.contractors);
    if (s.teams) { E.seedTeams(ctx); if (s.teams === "on") E.run("Connect-MicrosoftTeams", ctx); }
    for (const h of HOOKS) h(ctx, s);
    if (s.spo) ctx.spo = true;
    if (s.quirks) ctx.quirks = JSON.parse(JSON.stringify(s.quirks));
    if (s.files) for (const p of Object.keys(s.files)) ctx.fs[p] = { text: s.files[p], at: new Date(E.NOW.getTime() - 86400000 * 40) };
    if (pre && pre.length) {
      const saved = ctx.mg;
      E.run("Connect-MgGraph -Scopes User.ReadWrite.All,Group.ReadWrite.All,Organization.Read.All -NoWelcome", ctx);
      const ex = ctx.exo, tc = ctx.teams, sp = ctx.spo; ctx.exo = true; ctx.teams = !!ctx.t.teams; ctx.spo = !!ctx.t.sites;
      for (const p of pre) E.run(p, ctx);
      ctx.mg = saved; ctx.exo = ex; ctx.teams = tc; ctx.spo = sp;
    }
    ctx.host = []; ctx.errors = [];
    return ctx;
  }
  function describe(setup) {
    const s = SETUPS[setup] || SETUPS.none;
    if (!s.scopes.length && !s.exo && s.teams !== "on") return "Fresh window, nothing connected.";
    return (s.scopes.length ? "Connected to Graph with " + s.scopes.join(", ") : "Graph not connected") + (s.exo ? ", and to Exchange Online" : "") + (s.teams === "on" ? ", and to Microsoft Teams." : ".") + (s.cwd ? " You are in " + s.cwd.replace("/Users/kaatje", "~") + "." : "");
  }
  function text(res) { return E.formatOut(res.out, 120).replace(/[ \t]+$/gm, "").trim(); }
  const cache = {};
  function refText(chk, setup, pre) {
    const k = JSON.stringify([chk.out, chk.refSetup || setup, chk.needExo, pre || []]);
    if (cache[k] === undefined) { const ctx = makeCtx(chk.needExo ? "exo" : (chk.refSetup || setup), pre); cache[k] = text(E.run(chk.out, ctx)); }
    return cache[k];
  }
  function verdict(chk, setup, ctx, res, hist, pre) {
    if (!res || res.error && !chk.fn) return false;
    if (chk.fn) { try { return !!chk.fn(ctx, res, hist || []); } catch (e) { return false; } }
    if (res.error) return false;
    if (chk.out) {
      if (chk.needExo && !ctx.exo) return false;
      if (chk.needScopes && !chk.needScopes.every((s) => ctx.mg && ctx.mg.scopes.some((x) => x.toLowerCase() === s.toLowerCase()))) return false;
      const t = text(res); return t !== "" ? t === refText(chk, setup, pre) : refText(chk, setup, pre) === "" && false;
    }
    return false;
  }
  function fillTpl(tpl, vals) { let i = 0; return tpl.replace(/\[\[([^\[\]]*)\]\]/g, () => (vals[i++] || "")); }
  function gapsOf(tpl) { const out = []; tpl.replace(/\[\[([^\[\]]*)\]\]/g, (m, a) => { out.push(a); return m; }); return out; }
  function drillCheck(d) { return d.fn ? { fn: d.fn } : { out: d.out, refSetup: d.refSetup, needExo: d.needExo, needScopes: d.needScopes }; }
  return { HOOKS, makeCtx, verdict, text, fillTpl, gapsOf, refText, describe, drillCheck, SETUPS };
})();
if (typeof module !== "undefined") module.exports = GRADER;
