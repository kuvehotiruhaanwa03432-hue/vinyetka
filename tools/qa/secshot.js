// node secshot.js file.html prefix width scheme mode sel1,sel2,...  [click-selector]
const { chromium } = require('playwright'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  const [file,prefix,w,scheme,mode,sels,click]=process.argv.slice(2);
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:+w,height:844},colorScheme:scheme,deviceScaleFactor:1});
  await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); const ct=u.includes('fonts.googleapis.com')?'text/css':u.includes('gstatic')?'font/woff2':'application/octet-stream'; await r.fulfill({status:200,body,headers:{'content-type':ct,'access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+path.resolve(file),{waitUntil:'networkidle'});
  if(mode&&mode!=='client') await p.click(`[data-mode-btn="${mode}"]`);
  if(click) for(const c of click.split(',')) { await p.click(c); await p.waitForTimeout(1200); }
  for(const s of sels.split(',')){ const el=p.locator(s).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800); await el.screenshot({path:`${prefix}-${s.replace(/[^a-z0-9]/gi,'')}-${w}-${scheme}${mode&&mode!=='client'?'-'+mode:''}.png`}); }
  console.log(JSON.stringify(errs)); await b.close();
})();
