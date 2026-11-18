echo 'const PS=require("./engine.js");const GRADER=require("./grader.js");' > content.node.js
cat content.js drills01.js content2.js content3.js content4.js content5.js content6.js >> content.node.js
echo 'module.exports={MEMORIES,GATE,GATES,INCIDENT,BREAKS,AUTOMATE,SEQUENCES,ERR_HELP,DRILLS};' >> content.node.js
