const { chromium } = require('playwright');
const fs=require('fs'), path=require('path');
// варианты геометрии: каждая — список слоёв {band:[lo,hi], harm:[[mult,ampFrac,phaseAdd]], spread (доля лепестка), shrink}
const variants = {
 E: [
  {band:[.06,.42], harm:[[1,1,0]], spread:1, shrink:0},
  {band:[.30,.72], harm:[[1,.75,0],[2,.25,1.57]], spread:1, shrink:0},
  {band:[.58,.985],harm:[[1,.8,0],[3,.2,0]], spread:.72, shrink:.02}],
 F: [
  {band:[.06,.42], harm:[[1,1,0]], spread:1, shrink:0},
  {band:[.30,.72], harm:[[1,.6,0],[2,.4,0]], spread:1, shrink:0},
  {band:[.56,.985],harm:[[1,.55,0],[2,.45,1.57]], spread:.8, shrink:.025}],
};
function build(style, V, size){
 const R=size/2*.985; let out='';
 return Object.entries(variants).map(([name,layers])=>{
  let body='';
  style.layers.forEach((L,i)=>{
   const g=layers[i], n=L.petals, a=L.amp, phi=L.phase*Math.PI/180;
   const lo=g.band[0]*R, hi=g.band[1]*R, half=(hi-lo)/2;
   let d='', pts=1000;
   for(let j=0;j<pts;j++){const t=j/pts*2*Math.PI; let x,y;
     if(g.epi){ // z = r0 e^{it} + B e^{i(1+N)t}, петли
       const N=n*g.epi, B=half*.45*(.7+.3*a), r0=hi-B- half*.1; 
       const rr=r0+half*.1*Math.cos(n*t+phi);
       x=rr*Math.cos(t)+B*Math.cos((1+N)*t+phi); y=rr*Math.sin(t)+B*Math.sin((1+N)*t+phi);
     } else {
       let rho=0; const m=half*(.6+.4*a);
       for(const [mu,af,pa] of g.harm) rho+=m*af*Math.cos(mu*n*t+mu*phi+pa);
       rho+=hi-m; x=rho*Math.cos(t); y=rho*Math.sin(t);}
     d+=(j?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}
   const col=[L.colorL][0];
   body+=`<path id="${name}${i}" d="${d}Z" fill="none"/>`;
   let g2=`<g stroke="${col}" stroke-width=".6" fill="none">`;
   for(let k=0;k<17;k++){const rot=k*g.spread*360/n/17, sc=1-(g.shrink||0)*k/16; g2+=`<use href="#${name}${i}" transform="rotate(${rot.toFixed(3)}) scale(${sc.toFixed(4)})"/>`}
   body+=g2+'</g>';
  });
  return `<div><svg viewBox="${-size/2} ${-size/2} ${size} ${size}" width=${size} height=${size}><defs></defs>${body}</svg><p>${name}</p></div>`;
 }).join('');
}
(async()=>{
 const V=require('./vignette.js');
 const idxs=(process.argv[3]||"0").split(",").map(Number);
 const html=`<!doctype html><meta charset=utf-8><style>body{margin:0;background:#EDF3EE;display:flex;flex-wrap:wrap;font:14px sans-serif}p{margin:0;text-align:center}</style>${idxs.map(i=>build(V.PRESETS[i],V,560)).join("")}`;
 const f=path.join(__dirname,'.__lab2.html'); fs.writeFileSync(f,html);
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1120,height:1160}});
 await p.goto('file://'+f); await p.screenshot({path:process.argv[2]+'.png'}); await b.close();
})();
