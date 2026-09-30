// Usage: NODE_PATH=/opt/node22/lib/node_modules node shot.js <file.html> [outPrefix] [--full]
// Renders a page at phone (390) and desktop (1280) widths in light and dark,
// wrapping skeleton-less pages the way the Artifact publisher does.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const cache = new Map();
function curl(url){ if(cache.has(url)) return cache.get(url); const body = execFileSync('curl',['-sS','-L','-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',url],{maxBuffer:64*1024*1024}); cache.set(url, body); return body; }
(async () => {
  const file = path.resolve(process.argv[2]);
  const out = process.argv[3] || file.replace(/\.html$/, '');
  const full = process.argv.includes('--full');
  let html = fs.readFileSync(file, 'utf8');
  if (!/^\s*<!doctype/i.test(html)) {
    html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
  }
  const tmp = path.join(path.dirname(file), '.__preview_' + path.basename(file));
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ executablePath: undefined });
  const report = [];
  for (const [w, h] of [[390, 844], [1280, 800]]) for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1 });
    // Chromium does not trust the egress proxy CA; fetch remote assets through curl (which verifies TLS against the proxy bundle)
    await ctx.route(/^https:\/\//, async route => { const u = route.request().url(); try { const b = curl(u); const ct = u.includes('fonts.googleapis.com') ? 'text/css' : u.endsWith('.js') ? 'application/javascript' : u.includes('gstatic') ? 'font/woff2' : 'application/octet-stream'; await route.fulfill({ status: 200, body: b, headers: { 'content-type': ct, 'access-control-allow-origin': '*' } }); } catch (e) { await route.abort(); } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('requestfailed', r => errs.push('requestfailed: ' + r.url()));
    await page.goto('file://' + tmp, { waitUntil: 'networkidle' }).catch(e => errs.push('goto: ' + e.message));
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > de.clientWidth + 1 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 5).map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + ' right=' + Math.round(el.getBoundingClientRect().right));
      const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, height: de.scrollHeight, wide, fonts: [...new Set(fonts)] };
    });
    const name = `${out}-${w}-${scheme}.png`;
    await page.screenshot({ path: name, fullPage: full });
    report.push({ w, scheme, shot: name, overflowX: m.scrollW > m.clientW, height: m.height, wideEls: m.wide, fontsLoaded: m.fonts, errors: errs });
    await ctx.close();
  }
  await browser.close(); fs.unlinkSync(tmp);
  console.log(JSON.stringify(report, null, 1));
})();
