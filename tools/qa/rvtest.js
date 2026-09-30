const { chromium } = require('playwright'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 Chrome/140.0',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  const b=await chromium.launch(); const out={};
  for (const w of [1280,390]) {
  const ctx=await b.newContext({viewport:{width:w,height:844},colorScheme:'light'});
  await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); const ct=u.includes('fonts.googleapis.com')?'text/css':u.includes('gstatic')?'font/woff2':'application/octet-stream'; await r.fulfill({status:200,body,headers:{'content-type':ct,'access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+path.resolve('report.html'),{waitUntil:'networkidle'});
  if (w===1280){ await p.locator('#patFull').scrollIntoViewIfNeeded(); await p.waitForTimeout(3000); await p.locator('#patFull').screenshot({path:'shots/rv/t-unfold-end.png'}); }
  // modes: per section count visible data-m
  const res={};
  for (const m of ['client','pro','family']){ await p.click(`[data-mode-btn="${m}"]`); res[m]=await p.evaluate(()=>[...document.querySelectorAll('section.sec')].map(s=>s.id+':'+[...s.querySelectorAll('[data-m]')].filter(e=>e.offsetParent!==null).length).join(' ')); }
  out['modes'+w]=res;
  await p.click('[data-mode-btn="client"]');
  // seller
  await p.locator('[data-seller-btn]').last().click().catch(()=>{});
  await p.evaluate(()=>{}); 
  out['seller'+w]=await p.evaluate(()=>{ const t=document.body.innerText; return {on:document.documentElement.hasAttribute('data-seller'), torg:(t.match(/[^\n]*торг[^\n]*/gi)||[]), bud:(t.match(/[^\n]*(4 250|4 390|4 520|39 500)[^\n]*/g)||[])}; });
  await p.screenshot({path:`shots/rv/t-seller-${w}.png`});
  for (const m of ['pro','family']){ await p.click(`[data-mode-btn="${m}"]`); out['seller'+w+m]=await p.evaluate(()=>{ const t=document.body.innerText; return (t.match(/[^\n]*(торг|уступ|4 250|4 390|4 520|39 500)[^\n]*/gi)||[]); }); }
  await p.click('[data-mode-btn="client"]');
  await p.locator('.seller-sheet [data-seller-btn]').click();
  // try-on
  await p.click('.tryon summary'); await p.selectOption('#tryPreset','2'); await p.waitForTimeout(500);
  await p.fill('#tryName','Ян Бек'); await p.click('#tryApply'); await p.waitForTimeout(500);
  out['try'+w]=await p.evaluate(()=>[document.querySelector('#sealTxt').textContent, document.querySelector('#masterName').textContent, getComputedStyle(document.documentElement).getPropertyValue('--spec-a')]);
  await p.click('#tryReset');
  // family vote
  await p.click('[data-mode-btn="family"]'); await p.click('[data-vote="ask"]'); await p.fill('#voteText','Тест'); await p.click('#voteQ button[type=submit]');
  out['vote'+w]=await p.evaluate(()=>[document.querySelector('#voteNote').textContent, document.querySelector('#voteQNote').textContent, location.href.slice(-12)]);
  await p.click('[data-mode-btn="client"]');
  if (w===390){ await p.click('#foldBtn'); await p.waitForTimeout(1200); await p.locator('#fold').screenshot({path:'shots/rv/t-fold-390.png'}); }
  await p.click('#calqueBtn'); await p.click('#calqueBtn');
  await p.click('#sealBtn'); out['auth'+w]=await p.evaluate(()=>document.querySelector('#authBox').innerText);
  await p.click('#ackNot'); await p.click('#passBtn');
  out['errs'+w]=errs;
  await ctx.close(); }
  console.log(JSON.stringify(out,null,1)); await b.close();
})();
