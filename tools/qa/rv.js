// node rv.js file.html prefix width scheme [reduce]
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  const [file,prefix,w,scheme,rm]=process.argv.slice(2);
  let html=fs.readFileSync(file,'utf8');
  if(!/^\s*<!doctype/i.test(html)) html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
  const tmp=path.join(path.dirname(path.resolve(file)),'.__rv_'+w+scheme+(rm||'')+path.basename(file)); fs.writeFileSync(tmp,html);
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:+w,height:844},colorScheme:scheme,deviceScaleFactor:1,reducedMotion:rm?'reduce':'no-preference'});
  await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); const ct=u.includes('fonts.googleapis.com')?'text/css':u.includes('gstatic')?'font/woff2':'application/octet-stream'; await r.fulfill({status:200,body,headers:{'content-type':ct,'access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+tmp,{waitUntil:'networkidle'}); await p.waitForTimeout(800);
  const ids=await p.evaluate(()=>[...document.querySelectorAll('main > section, footer')].map(e=>e.id||e.tagName.toLowerCase()));
  for(const id of ids){ const el=p.locator(id==='footer'?'footer':'#'+id).first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); await el.screenshot({path:`${prefix}-${id}-${w}-${scheme}.png`}); }
  console.log(JSON.stringify({ids,errs})); await b.close(); fs.unlinkSync(tmp);
})();
