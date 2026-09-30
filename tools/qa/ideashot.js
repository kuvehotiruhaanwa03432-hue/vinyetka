// node ideashot.js file prefix width scheme sel1,sel2 [--act=js] [--max=1600]
const { chromium } = require('playwright'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 Chrome/140',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  const [file,prefix,w,scheme,sels]=process.argv.slice(2);
  const act=(process.argv.find(a=>a.startsWith('--act='))||'').slice(6);
  const max=+((process.argv.find(a=>a.startsWith('--max='))||'--max=1600').slice(6));
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:+w,height:900},colorScheme:scheme,deviceScaleFactor:1});
  await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); const ct=u.includes('fonts.googleapis.com')?'text/css':u.includes('gstatic')?'font/woff2':'application/octet-stream'; await r.fulfill({status:200,body,headers:{'content-type':ct,'access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+path.resolve(file),{waitUntil:'networkidle'}); await p.waitForTimeout(700);
  if(act){ await p.evaluate(act); await p.waitForTimeout(600); }
  for(const s of sels.split(',')){
    const bb = await p.evaluate(s=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};}, s);
    if(!bb){ errs.push('no '+s); continue; }
    const tag=s.replace(/[^a-z0-9]/gi,'');
    for(let k=0, y=bb.y; y<bb.y+bb.h; y+=max, k++){
      const h=Math.min(max, bb.y+bb.h-y);
      await p.screenshot({path:`${prefix}-${tag}-${w}-${scheme}-${k}.png`, clip:{x:0,y,width:+w,height:h}, fullPage:true});
    }
  }
  console.log(JSON.stringify(errs)); await b.close();
})();
