const fs = require("fs"), path = require("path");
const { bankScripts } = require("./lib.js");
const order = ["junle", "junos-lab", "subnle-pocket", "pyle", "pyle-pocket", "sleeple", "passle", "seqle", "hexle", "webble", "spelle", "rebble", "git-lab", "shelle", "poshle", "poshle-pocket", "modle"];
const banks = bankScripts(order);
const sync = fs.readFileSync(path.join(__dirname, "../../js/sync.js"), "utf8");
const tpl = fs.readFileSync(path.join(__dirname, "pockle.template.html"), "utf8");
fs.writeFileSync(process.argv[2], tpl.replace("<!--SYNC-->", () => "<script>\n" + sync + "\n</script>").replace("<!--BANKS-->", () => banks));
console.log("built with", order.filter(id => fs.existsSync(path.join(__dirname, "banks", id + ".js"))).join(", "));
