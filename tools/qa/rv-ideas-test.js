const { chromium } = require('playwright'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 Chrome/140',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:'light'});
  await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); await r.fulfill({status:200,body,headers:{'content-type':u.includes('googleapis')?'text/css':'font/woff2','access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  p.on('dialog',d=>{errs.push('dialog '+d.type()); d.dismiss();});
  await p.goto('file://'+path.resolve('ideas.html'),{waitUntil:'networkidle'}); await p.waitForTimeout(500);
  const sw=()=>p.evaluate(()=>document.documentElement.scrollWidth);
  for (const nm of ['Константин Константинопольский-Задунайский Абдурахманович','','Ян','John Smith 123','Злата Сергеевна Нуриева','   ']) {
    await p.fill('#nm',nm); await p.waitForTimeout(250);
    const r=await p.evaluate(()=>{const nb=document.querySelector('.namebox'); return {nbW:nb.scrollWidth, nbC:nb.clientWidth, derive:document.getElementById('derive').innerText.slice(0,160).replace(/\n/g,' | ')}});
    console.log(JSON.stringify(nm), 'docSW', await sw(), JSON.stringify(r));
  }
  // filters: every combo
  for (const g of ['all','rep','fld','mon','wld']) for (const m of [0,1]) {
    await p.click(`.chip[data-g="${g}"]`);
    const pressed = await p.getAttribute('#f-mvp','aria-pressed'); if ((pressed==='true')!==!!m) await p.click('#f-mvp');
    for (const s of ['brief','wow','eff']) { await p.click(`.chip[data-sort="${s}"]`); }
    console.log(g,m, await p.textContent('#count'), 'dims', await p.locator('.pt.dim').count());
  }
  await p.click('#f-brief'); console.log('brief mech visible', await p.locator('.i-mech:visible').count()); await p.click('#f-brief');
  // sliders
  for (const [id,v] of [['c-m','50'],['c-m','3000'],['c-f','1'],['c-f','12'],['c-p','0'],['c-p','100'],['c-f','2']]) { await p.fill('#'+id,v); await p.dispatchEvent('#'+id,'input'); console.log(id,v,await p.textContent('#r-tot'),'|',await p.textContent('#r-note')); }
  // keyboard on chart
  await p.locator('#s3').scrollIntoViewIfNeeded(); await p.focus('.pt[data-i="0"]'); await p.waitForTimeout(200);
  const tip=await p.evaluate(()=>{const t=document.getElementById('tip'); const r=t.getBoundingClientRect(); return {hidden:t.hidden, l:r.left, r:r.right, txt:t.innerText}});
  console.log('tip', JSON.stringify(tip));
  await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  console.log('focused', await p.evaluate(()=>document.activeElement.id), 'top', await p.evaluate(()=>document.getElementById('idea-1').getBoundingClientRect().top));
  // table link
  await p.click('a[href="#idea-17"]'); await p.waitForTimeout(900);
  console.log('idea17 top', await p.evaluate(()=>document.getElementById('idea-17').getBoundingClientRect().top));
  console.log('docSW end', await sw(), 'errs', JSON.stringify(errs)); await b.close();
})();
