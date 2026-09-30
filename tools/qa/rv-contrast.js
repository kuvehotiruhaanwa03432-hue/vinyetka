const { chromium } = require('playwright'); const path=require('path');
(async()=>{
  const b=await chromium.launch();
  for (const scheme of ['light','dark']) {
    const p=await (await b.newContext({colorScheme:scheme})).newPage();
    await p.route(/^https:/, r=>r.abort());
    await p.goto('file://'+path.resolve('ideas.html')); await p.waitForTimeout(300);
    const out=await p.evaluate(()=>{
      const V=window.Vignette, cs=getComputedStyle(document.documentElement), g=n=>cs.getPropertyValue(n).trim();
      const rgb=s=>{const m=s.match(/\d+(\.\d+)?/g).map(Number); return '#'+m.slice(0,3).map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');};
      const res=[];
      // sample actual elements: text color vs nearest opaque background
      const bgOf=el=>{while(el){const c=getComputedStyle(el).backgroundColor; if(c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && !/, 0\)$/.test(c)) return c; el=el.parentElement;} return getComputedStyle(document.body).backgroundColor;};
      const seen={};
      document.querySelectorAll('body *').forEach(el=>{
        if(!el.childNodes.length) return; const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()); if(!hasText) return;
        if(el.closest('[aria-hidden="true"]')||el.closest('svg')) return;
        const st=getComputedStyle(el); if(st.display==='none'||st.visibility==='hidden') return;
        const fg=rgb(st.color), bg=rgb(bgOf(el)); const k=fg+bg; if(seen[k]) {seen[k].n++; return;}
        const c=V.contrast(fg,bg); seen[k]={fg,bg,c:+c.toFixed(2),n:1,ex:el.className+'|'+el.textContent.trim().slice(0,30)};
      });
      return Object.values(seen).filter(x=>x.c<4.5);
    });
    console.log(scheme, JSON.stringify(out,null,0));
  }
  await b.close();
})();
