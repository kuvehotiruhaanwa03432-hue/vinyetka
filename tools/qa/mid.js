const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 Chrome/140.0',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{ let html=fs.readFileSync('index.html','utf8'); html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
 const tmp=path.resolve('.__m.html'); fs.writeFileSync(tmp,html); const b=await chromium.launch();
 for (const [w,scheme,rm,tag] of [[1280,'light',false,'fin'],[390,'dark',false,'fin'],[390,'light',true,'rm']]){
 const ctx=await b.newContext({viewport:{width:w,height:w>900?900:844},colorScheme:scheme,reducedMotion:rm?'reduce':'no-preference'});
 await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); await r.fulfill({status:200,body,headers:{'content-type':u.includes('googleapis')?'text/css':'font/woff2','access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
 const p=await ctx.newPage(); await p.goto('file://'+tmp,{waitUntil:'networkidle'}); await p.waitForTimeout(500);
 if(w<900) await p.evaluate(()=>window.scrollTo(0,300));
 await p.fill('#fio','Злата Сергеевна Нуриева'); await p.waitForTimeout(250+800);
 const flies=await p.evaluate(()=>document.querySelectorAll('.fly').length);
 await p.screenshot({path:`shots/${tag}-mid-${w}-${scheme}.png`});
 await p.waitForTimeout(3500); await p.screenshot({path:`shots/${tag}-end-${w}-${scheme}.png`});
 console.log(w,scheme,rm,'flies mid',flies); await ctx.close(); }
 await b.close(); fs.unlinkSync(tmp); })();
