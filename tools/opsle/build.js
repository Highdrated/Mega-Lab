const fs = require("fs"), path = require("path");
const { bankScripts, safe } = require("../pockle/lib.js");
const order = ["junle", "junos-lab", "subnle-pocket", "pyle", "pyle-pocket", "sleeple", "passle", "seqle", "hexle", "webble", "spelle", "rebble", "git-lab", "shelle", "poshle", "poshle-pocket", "modle"];
const mp = path.join(__dirname, "../missions/ops_missions.json");
const missions = fs.existsSync(mp) ? JSON.parse(fs.readFileSync(mp, "utf8")) : [];
const tpl = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");
const out = tpl.replace("<!--BANKS-->", () => bankScripts(order)).replace("__MISSIONS__", () => safe(JSON.stringify(missions)));
fs.writeFileSync(path.join(__dirname, "../../labs/opsle.html"), out);
console.log("opsle built with", missions.length, "missions");
