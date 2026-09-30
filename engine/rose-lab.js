// Быстрый стенд: рендер одной-трёх розеток крупно в PNG
const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
(async()=>{
  const out=process.argv[2]||'shots/lab';
  const html=`<!doctype html><meta charset=utf-8><style>body{margin:0;background:#EDF3EE;display:flex;flex-wrap:wrap}div{width:600px;height:600px}.d{background:#0E171B}</style>
  <div id=a></div><div id=b></div><div class=d id=c></div><div id=d></div>
  <script src="vignette.js"></script><script>
  const V=window.Vignette;
  let t=performance.now();
  a.innerHTML=V.rosetteSVG(V.PRESETS[0],{size:600,theme:'light'});
  const t1=performance.now()-t;
  b.innerHTML=V.rosetteSVG(V.PRESETS[5],{size:600,theme:'light'});
  c.innerHTML=V.rosetteSVG(V.PRESETS[0],{size:600,theme:'dark'});
  d.innerHTML=V.rosetteSVG(V.PRESETS[2],{size:600,theme:'light'});
  document.title=t1.toFixed(1);
  </script>`;
  const f=path.join(__dirname,'.__lab.html'); fs.writeFileSync(f,html);
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1200,height:1200}});
  await p.goto('file://'+f); await p.waitForTimeout(300);
  console.log('ms', await p.title());
  await p.screenshot({path:out+'.png'});
  await p.screenshot({path:out+'-zoom.png',clip:{x:300,y:0,width:300,height:300}});
  await b.close();
})();
