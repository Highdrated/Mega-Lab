const fs = require("fs"), path = require("path");
function strip(src) {
  let out = "", i = 0, q = null, last = "";
  while (i < src.length) {
    const ch = src[i], nx = src[i + 1];
    if (q) {
      out += ch;
      if (ch === "\\") { out += nx; i += 2; continue; }
      if (ch === q) q = null;
      i++; continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; out += ch; i++; continue; }
    if (ch === "/" && nx === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (ch === "/" && nx === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (ch === "/" && /[(,=:\[!&|?{};]/.test(last)) {
      out += ch; i++;
      let cls = false;
      while (i < src.length) { const c = src[i]; out += c; i++; if (c === "\\") { out += src[i]; i++; continue; } if (c === "[") cls = true; else if (c === "]") cls = false; else if (c === "/" && !cls) break; }
      last = "/"; continue;
    }
    out += ch; if (!/\s/.test(ch)) last = ch; i++;
  }
  return out.replace(/\n\s*\n+/g, "\n");
}

function bankScripts(ids) {
  const dir = path.join(__dirname, "banks");
  return ids.filter(id => fs.existsSync(path.join(dir, id + ".js"))).map(id => {
    const s = strip(fs.readFileSync(path.join(dir, id + ".js"), "utf8"));
    new Function("POCKET", s);
    return "<script>\n" + safe(s) + "\n</script>";
  }).join("\n");
}
function safe(s) { return s.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3C!--").replace(/<script/gi, "\\x3Cscript"); }
module.exports = { strip, bankScripts, safe };
