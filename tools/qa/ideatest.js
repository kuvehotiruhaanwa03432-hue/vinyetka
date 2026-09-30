const { chromium } = require('playwright'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 Chrome/140',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:900},colorScheme:'dark'});
  await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); await r.fulfill({status:200,body,headers:{'content-type':u.includes('googleapis')?'text/css':'font/woff2','access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+path.resolve('ideas.html'),{waitUntil:'networkidle'}); await p.waitForTimeout(500);
  await p.click('.chip[data-g="mon"]'); await p.click('#f-mvp');
  console.log('count', await p.textContent('#count'), 'dim', await p.locator('.pt.dim').count());
  await p.click('.chip[data-sort="wow"]');
  console.log('order', await p.$$eval('.idea:not([hidden]) .i-num span', a=>a.map(x=>x.textContent).join(',')));
  await p.click('.chip[data-g="all"]'); await p.click('#f-mvp');
  console.log('order all wow', await p.$$eval('.idea:not([hidden]) .i-num span', a=>a.map(x=>x.textContent).join(',')));
  await p.locator('#s3').scrollIntoViewIfNeeded();
  const pt=p.locator('.pt[data-i="19"]'); await pt.hover(); await p.waitForTimeout(300);
  await p.locator('#chart-wrap').screenshot({path:'shots/id-tip.png'});
  await p.keyboard.press('Tab'); await p.waitForTimeout(200);
  await pt.click(); await p.waitForTimeout(1200);
  console.log('scrollY', await p.evaluate(()=>scrollY), 'idea20 top', await p.evaluate(()=>document.getElementById('idea-20').getBoundingClientRect().top));
  await p.fill('#nm','Злата Сергеевна Нуриева'); await p.waitForTimeout(400);
  await p.locator('.namebox').screenshot({path:'shots/id-name.png'});
  await p.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
  await p.locator('#s3 .chart-wrap').screenshot({path:'shots/id-chart-forced-light.png'});
  console.log(JSON.stringify(errs)); await b.close();
})();
