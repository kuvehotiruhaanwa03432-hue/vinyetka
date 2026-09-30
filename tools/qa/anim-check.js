const { chromium } = require('playwright'); const fs=require('fs'),path=require('path');
(async()=>{const f=path.join(__dirname,'.__anim.html');
fs.writeFileSync(f,`<!doctype html><body style="margin:0;background:#EDF3EE"><div id=a></div><script src="vignette.js"></script><script>a.innerHTML=Vignette.rosetteSVG(Vignette.PRESETS[0],{size:400,animate:true});</script>`);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:400,height:400}});await p.goto('file://'+f);
await p.waitForTimeout(1200);await p.screenshot({path:'shots/anim-mid.png'});await p.waitForTimeout(2500);await p.screenshot({path:'shots/anim-end.png'});await b.close();})();
