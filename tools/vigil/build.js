const fs = require("fs"), path = require("path");
const here = __dirname;
const data = fs.readFileSync(path.join(here, "data.js"), "utf8");
const tpl = fs.readFileSync(path.join(here, process.argv[2] || "demo.template.html"), "utf8");
const out = process.argv[3] || path.join(here, "out", "vigil-demo.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, tpl.replace("<!--DATA-->", () => "<script>\n" + data.replace(/<\/script/gi, "<\\/script") + "\n</script>"));
console.log("wrote", out);
