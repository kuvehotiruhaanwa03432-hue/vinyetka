// interactive tests
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 Chrome/140.0',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  const file='index.html'; const rm=process.argv[2]==='reduce';
  let html=fs.readFileSync(file,'utf8');
  html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
  const tmp=path.resolve('.__it_'+(rm?'r':'')+'.html'); fs.writeFileSync(tmp,html);
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:rm?'reduce':'no-preference'});
  await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); const ct=u.includes('fonts.googleapis.com')?'text/css':'font/woff2'; await r.fulfill({status:200,body,headers:{'content-type':ct,'access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  p.on('dialog',d=>{errs.push('dialog '+d.type()); d.dismiss();});
  await p.goto('file://'+tmp,{waitUntil:'networkidle'});
  const st=()=>p.evaluate(()=>({vig:document.documentElement.getAttribute('data-vignette'),a:document.documentElement.style.getPropertyValue('--spec-a-l'),hex:[...document.querySelectorAll('#hexA .strip,#hexB .strip')].map(s=>'0123456789ABCDEF'[Math.round(parseFloat(s.style.getPropertyValue('--n')))%16]).join(''),raw:document.getElementById('rawA').textContent+document.getElementById('rawB').textContent,fio2:document.getElementById('fio2').value,flies:document.querySelectorAll('.fly').length,status:document.getElementById('imen-status').textContent,pat:document.getElementById('patterns').innerText.slice(0,120)}));
  const out={};
  out.initial=await st();
  // 1 type name then click preset mid-animation
  await p.fill('#fio','Злата Сергеевна Нуриева'); await p.waitForTimeout(250+700);
  await p.click('#master-3'); await p.waitForTimeout(3500);
  out.presetDuringAnim=await st();
  out.expected3=await p.evaluate(()=>Vignette.PRESETS[3].styleCode);
  // 2 rapid typing/erasing
  await p.fill('#fio',''); for(const ch of 'Иван Петров') { await p.type('#fio',ch,{delay:40}); }
  for(let i=0;i<3;i++){ await p.press('#fio','Backspace'); await p.waitForTimeout(300);} 
  await p.waitForTimeout(4000); out.rapid=await st(); out.expRapid=await p.evaluate(()=>Vignette.fromName('Иван Пет').styleCode);
  // 3 empty
  await p.fill('#fio',''); await p.waitForTimeout(4000); out.empty=await st();
  // 4 latin
  await p.fill('#fio','John Fitzgerald Kennedy'); await p.waitForTimeout(4000); out.latin=await st(); out.expLatin=await p.evaluate(()=>Vignette.fromName('John Fitzgerald Kennedy').styleCode);
  // 5 weird
  await p.fill('#fio','<b>&amp; 123 ——'); await p.waitForTimeout(4000); out.weird=await st();
  // 6 rotate x3 then reset
  await p.click('#rotate'); await p.waitForTimeout(3500); await p.click('#rotate'); await p.waitForTimeout(3500);
  out.rotDisabled=await p.evaluate(()=>document.getElementById('rotate').disabled);
  await p.click('#reset'); await p.waitForTimeout(3500); out.reset=await st();
  // 7 fio2 sync
  await p.fill('#fio2','Ян Бек'); await p.waitForTimeout(4000); out.fio2=await st(); out.fioVal=await p.inputValue('#fio');
  // 8 submit final
  await p.click('#final-form button[type=submit]'); out.finalMsg=await p.evaluate(()=>!document.getElementById('final-msg').hidden);
  // 9 modes
  await p.click('label[for=mode-own]'); out.mode=await p.evaluate(()=>document.getElementById('anatomy').dataset.mode);
  // 10 apply btn, enter key in hero form
  await p.click('#master-5'); await p.click('#d-apply'); await p.waitForTimeout(500); out.apply=await st();
  await p.fill('#fio','Вера Сергеевна Обозова'); await p.press('#fio','Enter'); await p.waitForTimeout(4000); out.enter=await st(); out.url=p.url().slice(-20);
  out.errs=errs; console.log(JSON.stringify(out,null,1)); await b.close(); fs.unlinkSync(tmp);
})();
