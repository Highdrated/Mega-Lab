echo 'const PS=require("./engine.js");const GRADER=require("./grader.js");' > content.node.js
cat content.js drills01.js content2.js content3.js content4.js content5.js content6.js content7.js content8.js content9.js >> content.node.js
echo 'module.exports={vigilOops:typeof vigilOops!=="undefined"?vigilOops:null,MEMORIES,GATE,GATES,INCIDENT,BREAKS,AUTOMATE,POLDER,SPRING,SEQUENCES,ERR_HELP,DRILLS};' >> content.node.js
