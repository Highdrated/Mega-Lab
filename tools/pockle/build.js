const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "banks");
const order = ["junle", "junos-lab", "subnle-pocket", "pyle", "pyle-pocket", "sleeple", "passle", "seqle", "hexle", "webble", "spelle", "rebble", "git-lab", "shelle", "poshle", "poshle-pocket", "modle"];
const files = order.filter(id => fs.existsSync(path.join(dir, id + ".js")));

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

const banks = files.map(id => {
  const s = strip(fs.readFileSync(path.join(dir, id + ".js"), "utf8"));
  new Function("POCKET", s);
  return "<script>\n" + s.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3C!--").replace(/<script/gi, "\\x3Cscript") + "\n</script>";
}).join("\n");
const tpl = fs.readFileSync(path.join(__dirname, "pockle.template.html"), "utf8");
fs.writeFileSync(process.argv[2], tpl.replace("<!--BANKS-->", () => banks));
console.log("built with", files.join(", "));
