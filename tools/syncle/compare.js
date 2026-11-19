const CMP = (() => {
  function shape(t) {
    const lines = t.split("\n").map((l) => l.replace(/\s+$/, ""));
    const nz = lines.filter((l) => l.trim());
    if (nz.length >= 2 && /^-{2,}(\s+-{2,})*$/.test(nz[1].trim())) {
      const head = nz[0], dash = nz[1];
      const cols = []; const re = /-+/g; let m;
      while ((m = re.exec(dash))) cols.push([m.index, m.index + m[0].length]);
      const cut = (l) => cols.map(([s], i) => l.slice(s, i + 1 < cols.length ? cols[i + 1][0] : undefined).trim());
      return { kind: "table", cols: cut(head), rows: nz.slice(2).map(cut) };
    }
    if (nz.some((l) => /^\S[^:]*?\s*:\s/.test(l)) && nz.filter((l) => /\s:\s|:$/.test(l)).length >= nz.length * 0.6) return { kind: "list", rows: nz };
    return { kind: "plain", rows: nz.map((l) => l.trim()) };
  }
  const key = (r) => (Array.isArray(r) ? r.join("\u0001") : r).toLowerCase();
  function tips(mine, exp) {
    const a = shape(mine), b = shape(exp), out = [];
    if (!mine.trim()) { out.push("Nothing came back. Check the filter spelling, the time window, or whether the thing exists at all."); return out; }
    if (a.kind === "table" && b.kind === "plain") out.push("The expected answer is plain values with no column header. That is -ExpandProperty, not a one-column Select-Object.");
    if (a.kind === "plain" && b.kind === "table") out.push("The expected answer has a column header (" + b.cols.join(", ") + "). Use Select-Object with property names, not -ExpandProperty.");
    if (a.kind === "list" && b.kind === "table") out.push("Yours came out as a list; the answer is a table. Fewer columns (Select-Object) usually switches it to a table.");
    if (a.kind === "table" && b.kind === "list") out.push("The answer is a list (Format-List), yours is a table.");
    if (a.kind === "table" && b.kind === "table") {
      const al = a.cols.map((c) => c.toLowerCase()), bl = b.cols.map((c) => c.toLowerCase());
      const miss = b.cols.filter((c) => !al.includes(c.toLowerCase())), extra = a.cols.filter((c) => !bl.includes(c.toLowerCase()));
      if (miss.length) out.push("Missing column" + (miss.length > 1 ? "s" : "") + ": " + miss.join(", ") + ".");
      if (extra.length) out.push("Extra column" + (extra.length > 1 ? "s" : "") + ": " + extra.join(", ") + ".");
      if (!miss.length && !extra.length && al.join() !== bl.join()) out.push("Right columns, wrong order. Select-Object shows them in the order you list them: " + b.cols.join(", ") + ".");
    }
    const ar = a.rows || [], br = b.rows || [];
    if (a.kind === b.kind) {
      const sameCols = a.kind !== "table" || a.cols.join().toLowerCase() === b.cols.join().toLowerCase();
      const ak = ar.map(key), bk = br.map(key);
      const dup = ak.length !== new Set(ak).size;
      if (ar.length > br.length) out.push("You have " + ar.length + " rows, the answer has " + br.length + "." + (dup && new Set(ak).size === br.length ? " Yours repeats values: -Unique." : " A filter is missing or too loose."));
      else if (ar.length < br.length) out.push("You have " + ar.length + " rows, the answer has " + br.length + ". The filter is too strict, or a -First / -Top / missing -All cut it short.");
      else if (sameCols && ak.join("\n") !== bk.join("\n")) {
        if (ak.slice().sort().join("\n") === bk.slice().sort().join("\n")) out.push("Same rows, different order. Sort the way the ticket asks (check the property and -Descending), or drop a Sort-Object it never asked for.");
        else if (!ak.some((k) => bk.includes(k))) out.push("None of your rows are in the answer. You may be looking at the other end of the list (-First vs -Last, missing or extra -Descending) or at the wrong filter.");
        else out.push("Same number of rows, different values. Look at the rows marked on both sides.");
      }
    }
    if (!out.length && mine.toLowerCase().replace(/\s+/g, " ") === exp.toLowerCase().replace(/\s+/g, " ")) out.push("Only upper and lower case differ. Look at the marked lines: a value you typed is shown exactly as you typed it.");
    if (!out.length) out.push("Close. Compare the marked lines: spelling, spacing or a property name.");
    return out;
  }
  function panel(mine, exp, escf) {
    const ml = mine.split("\n"), el = exp.split("\n");
    const nm = (l) => l.trim().replace(/\s+/g, " ");
    const mset = new Set(ml.map(nm)), eset = new Set(el.map(nm));
    const col = (lines, other) => lines.map((l) => { const t = l.trim(); const bad = t && !/^-+(\s+-+)*$/.test(t) && !other.has(nm(l)); return '<span class="' + (bad ? "dx" : "") + '">' + escf(l || " ") + "</span>"; }).join("\n");
    return '<div class="cmp"><div class="cmpb"><div><span class="cmpl">YOURS</span><pre>' + col(ml.slice(0, 40), eset) + '</pre></div><div><span class="cmpl">EXPECTED</span><pre>' + col(el.slice(0, 40), mset) + '</pre></div></div><ul class="cmpt">' + tips(mine, exp).map((t) => "<li>" + escf(t) + "</li>").join("") + "</ul></div>";
  }
  function attempted(cmd, refCmd, mine, exp) {
    const first = (s) => { const m = /(?:^|[;|]\s*|=\s*)([A-Za-z]+-[A-Za-z]+)/.exec(String(s || "")); return m ? m[1].toLowerCase() : null; };
    const stages = (s) => String(s || "").split("|").length;
    if (first(cmd) && first(cmd) === first(refCmd) && stages(cmd) >= Math.max(1, stages(refCmd) - 1)) return true;
    const a = shape(mine), b = shape(exp);
    return a.kind === "table" && b.kind === "table" && a.cols.some((c) => b.cols.map((x) => x.toLowerCase()).includes(c.toLowerCase()));
  }
  return { tips, panel, attempted, shape };
})();
if (typeof module !== "undefined") module.exports = CMP;
