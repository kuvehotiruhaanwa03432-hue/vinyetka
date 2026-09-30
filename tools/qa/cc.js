const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const { execFileSync } = require('child_process');
const cache=new Map(); function curl(u){ if(cache.has(u)) return cache.get(u); const b=execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 Chrome/140.0',u],{maxBuffer:64<<20}); cache.set(u,b); return b; }
(async()=>{
  let html=fs.readFileSync('index.html','utf8');
  html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
  const tmp=path.resolve('.__cc.html'); fs.writeFileSync(tmp,html);
  const b=await chromium.launch();
  for(const scheme of ['light','dark']) for(const preset of [-1,1,2,3,4,5,6]){
    const ctx=await b.newContext({viewport:{width:1280,height:900},colorScheme:scheme,reducedMotion:'reduce'});
    await ctx.route(/^https:\/\//, async r=>{ const u=r.request().url(); try{ const body=curl(u); await r.fulfill({status:200,body,headers:{'content-type':u.includes('googleapis')?'text/css':'font/woff2','access-control-allow-origin':'*'}}); }catch(e){ await r.abort(); } });
    const p=await ctx.newPage(); await p.goto('file://'+tmp,{waitUntil:'networkidle'});
    if(preset>=0){ await p.click('#master-'+preset); await p.waitForTimeout(300); }
    const bad=await p.evaluate(()=>{
      function parse(c){ const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [a[0],a[1],a[2],a.length>3?a[3]:1]; }
      function lum(c){ const f=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}; return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); }
      function bg(el){ let layers=[]; while(el){ const cs=getComputedStyle(el); const c=parse(cs.backgroundColor); if(cs.backgroundImage!=='none' && !layers.length) {} if(c&&c[3]>0){ layers.push(c); if(c[3]>=1) break; } el=el.parentElement; }
        let out=[255,255,255]; for(let i=layers.length-1;i>=0;i--){ const c=layers[i]; out=out.map((v,k)=>v*(1-c[3])+c[k]*c[3]); } return out; }
      const res=[]; const seen=new Set();
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      let n; while(n=walker.nextNode()){ if(!n.textContent.trim()) continue; const el=n.parentElement; if(seen.has(el)) continue; seen.add(el);
        if(el.closest('[aria-hidden="true"],svg,.sr,style,script')) continue;
        const r=el.getBoundingClientRect(); if(!r.width||!r.height) continue; const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none') continue;
        const fg=parse(cs.color); if(!fg) continue; const b=bg(el); const f=fg.slice(0,3).map((v,k)=>v*fg[3]+b[k]*(1-fg[3]));
        const L1=lum(f),L2=lum(b); const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
        if(cr<4.5) res.push((el.className||el.tagName)+' "'+n.textContent.trim().slice(0,30)+'" '+cr.toFixed(2)+' '+cs.fontSize);
      } return res; });
    console.log(scheme, preset, bad.length, JSON.stringify(bad.slice(0,12)));
    await ctx.close();
  }
  await b.close(); fs.unlinkSync(tmp);
})();
