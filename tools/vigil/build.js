const fs = require("fs"), path = require("path");
const here = __dirname;
const data = fs.readFileSync(path.join(here, "data.js"), "utf8");
const tpl = fs.readFileSync(path.join(here, "demo.template.html"), "utf8");
const D = {};
new Function("D", data.replace(/^const (\w+) =/gm, "D.$1 ="))(D);
D.GROUPS.forEach(g => { if (!/^[a-z]+$/.test(g.id)) throw new Error("GROUPS id must be lowercase letters only, since lesson keys are id plus index: " + g.id); });
function write(out, demo) {
  if (!tpl.includes("/*DEMO*/true")) throw new Error("template is missing the /*DEMO*/ marker");
  const html = tpl.replace("/*DEMO*/true", demo ? "true" : "false").replace("<!--DATA-->", () => "<script>\n" + data.replace(/<\/script/gi, "<\\/script") + "\n</script>");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log("wrote", out, demo ? "(demo)" : "(lab)");
}
const arg = process.argv[2];
if (arg) write(path.resolve(arg), false);
else {
  write(path.join(here, "out", "vigil-demo.html"), true);
  write(path.join(here, "..", "..", "labs", "vigil.html"), false);
}
