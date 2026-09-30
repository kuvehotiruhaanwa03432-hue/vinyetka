/*!
 * Виньетка · движок персонального стиля мастера (vignette.js)
 * Без зависимостей. UMD: window.Vignette в браузере, module.exports в node.
 *
 *   const s = Vignette.fromName('\u0410\u043b\u0435\u043a\u0441\u0435\u0439 \u0410\u043d\u0434\u0440\u0435\u0435\u0432\u0438\u0447 \u041f\u043e\u0434\u0431\u043e\u0440\u043a\u0438\u043d');
 *   Vignette.apply(s);                                  // CSS-переменные + data-template/data-rail
 *   el.innerHTML = Vignette.rosetteSVG(s, { size: 320, animate: true });
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.Vignette = api;
  else if (root) root.Vignette = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Константы бренда (фиксированы для всех мастеров)
   * ------------------------------------------------------------------ */
  var PAPER = {
    light: { paper: '#EDF3EE', raised: '#F9FCF9', sunken: '#DCE7DF', ink: '#111111' },
    dark:  { paper: '#0E171B', raised: '#15232A', sunken: '#0A1114', ink: '#E4EFE6' }
  };
  var GUILLOCHE = '#779999';            // #799 — патина, первый слой розетки
  // Системные цвета данных. Отталкиваемся от их РЕАЛЬНОГО оттенка в OKLCH
  // (номинальные 5°/120°/137°/203° из брифа — это HSL-подобные «имена» оттенков).
  var SYSTEM = { danger: '#BD0D09', ok: '#246A0F', clean: '#1A6B40', doubt: '#0A6590' };
  var SYSTEM_NOMINAL = { danger: 5, ok: 120, clean: 137, doubt: 203 };
  var TEMPLATES = [[13, 3, 1], [8, 5, 3, 1], [1, 8, 8], [5, 5, 5, 2], [3, 13, 1], [8, 5, 2, 2], [1, 3, 13]];
  var GOLDEN = 137.50776405003785;

  // Кириллица в строках экранирована \uXXXX — файл работает даже на странице без <meta charset>.
  // RU = «абвгдеёжзийклмнопрстуфхцчшщъыьэюя»; HOMO: а→A в→B с→C е→E ё→E б→6 ч→4 з→3 о→0 ь→B
  var RU = '\u0430\u0431\u0432\u0433\u0434\u0435\u0451\u0436\u0437\u0438\u0439\u043a\u043b\u043c\u043d\u043e\u043f\u0440\u0441\u0442\u0443\u0444\u0445\u0446\u0447\u0448\u0449\u044a\u044b\u044c\u044d\u044e\u044f';           // А=1 … Ё=7 … Я=33
  var HOMO = { '\u0430': 'A', '\u0432': 'B', '\u0441': 'C', '\u0435': 'E', '\u0451': 'E', '\u0431': '6', '\u0447': '4', '\u0437': '3', '\u043e': '0', '\u044c': 'B' };
  var VIN_ALPHA = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';        // без I, O, Q
  var VIN_TRANSLIT = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  var VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  var INITIAL = { '\u0430': 'A', '\u0431': 'B', '\u0432': 'V', '\u0433': 'G', '\u0434': 'D', '\u0435': 'E', '\u0451': 'E', '\u0436': 'Z', '\u0437': 'Z', '\u0438': '1', '\u0439': 'J', '\u043a': 'K', '\u043b': 'L', '\u043c': 'M', '\u043d': 'N', '\u043e': '0', '\u043f': 'P', '\u0440': 'R', '\u0441': 'S', '\u0442': 'T', '\u0443': 'U', '\u0444': 'F', '\u0445': 'H', '\u0446': 'C', '\u0447': 'C', '\u0448': 'S', '\u0449': 'S', '\u044a': 'X', '\u044b': 'Y', '\u044c': 'X', '\u044d': 'E', '\u044e': 'U', '\u044f': 'Y', 'i': '1', 'o': '0', 'q': '9' };

  /* ------------------------------------------------------------------ *
   * Цвет: sRGB ⇄ OKLab/OKLCH, WCAG-контраст
   * ------------------------------------------------------------------ */
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mod(a, n) { return ((a % n) + n) % n; }
  function hueDist(a, b) { var d = Math.abs(mod(a, 360) - mod(b, 360)); return d > 180 ? 360 - d : d; }
  function hexToRgb(hex) {
    var h = String(hex).replace('#', '').trim();
    if (h.length === 3 || h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    h = h.slice(0, 6);
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }
  function toHex2(v) { var s = Math.round(clamp(v, 0, 1) * 255).toString(16).toUpperCase(); return s.length < 2 ? '0' + s : s; }
  function rgbToHex(rgb) { return '#' + toHex2(rgb[0]) + toHex2(rgb[1]) + toHex2(rgb[2]); }
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function delin(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function luminance(hex) { var c = hexToRgb(hex); return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function contrast(h1, h2) { var a = luminance(h1), b = luminance(h2); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }

  function rgbToOklab(rgb) {
    var r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function oklabToLinRgb(L, a, b) {
    var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    var s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
           -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  function hexToOklch(hex) {
    var lab = rgbToOklab(hexToRgb(hex));
    var c = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
    return { l: lab[0], c: c, h: mod(Math.atan2(lab[2], lab[1]) * 180 / Math.PI, 360) };
  }
  function inGamut(L, C, h) {
    var r = oklabToLinRgb(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180));
    var e = 1e-4;
    return r[0] >= -e && r[0] <= 1 + e && r[1] >= -e && r[1] <= 1 + e && r[2] >= -e && r[2] <= 1 + e;
  }
  /** oklchToHex(l, c, h) или oklchToHex({l,c,h}); хрома уменьшается до попадания в sRGB. */
  function oklchToHex(L, C, h) {
    if (typeof L === 'object') { h = L.h; C = L.c; L = L.l; }
    if (!inGamut(L, C, h)) {
      var lo = 0, hi = C;
      for (var i = 0; i < 24; i++) { var mid = (lo + hi) / 2; if (inGamut(L, mid, h)) lo = mid; else hi = mid; }
      C = lo;
    }
    var r = oklabToLinRgb(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180));
    return rgbToHex([delin(clamp(r[0], 0, 1)), delin(clamp(r[1], 0, 1)), delin(clamp(r[2], 0, 1))]);
  }

  var SYSTEM_HUES = {};
  Object.keys(SYSTEM).forEach(function (k) { SYSTEM_HUES[k] = hexToOklch(SYSTEM[k]).h; });

  /** Отталкивание от системных оттенков: ближе 20° → сдвиг на 40° прочь. */
  function repel(h) {
    h = mod(h, 360);
    for (var guard = 0; guard < 8; guard++) {
      var hit = null;
      for (var k in SYSTEM_HUES) if (hueDist(h, SYSTEM_HUES[k]) < 20) { hit = SYSTEM_HUES[k]; break; }
      if (hit === null) return h;
      var signed = mod(h - hit + 180, 360) - 180;              // −180..180
      h = mod(h + (signed >= 0 ? 40 : -40), 360);
    }
    return h;
  }

  /* ------------------------------------------------------------------ *
   * Разбор имени
   * ------------------------------------------------------------------ */
  function letterValue(ch) {
    var lo = ch.toLowerCase();
    var i = RU.indexOf(lo);
    if (i >= 0) return i + 1;
    var code = lo.charCodeAt(0);
    if (code >= 97 && code <= 122) return code - 96;
    return 0;
  }
  function hexOf(ch) {
    var lo = ch.toLowerCase();
    if (HOMO[lo]) return HOMO[lo];
    if (/[a-f0-9]/.test(lo)) return lo.toUpperCase();
    return null;
  }
  function parseName(fullName) {
    var name = String(fullName == null ? '' : fullName).replace(/\s+/g, ' ').trim();
    var raw = name ? name.split(' ') : [];
    var words = [], letters = [], sums = [];
    raw.forEach(function (w) {
      var n = 0, s = 0;
      for (var i = 0; i < w.length; i++) { var v = letterValue(w[i]); if (v) { n++; s += v; } }
      if (n) { words.push(w); letters.push(n); sums.push(s); }
    });
    return { name: name, words: words, letters: letters, sums: sums };
  }

  /* ------------------------------------------------------------------ *
   * Цветовая пара мастера
   * ------------------------------------------------------------------ */
  function textOn(theme, h, rawC) {
    // текст/линии ≥ 4.5:1 на всех трёх плоскостях темы
    var P = PAPER[theme];
    var C = Math.min(0.15, 0.10 + 0.05 * Math.min(1, rawC / 0.18));
    var L = theme === 'light' ? 0.52 : 0.74, step = theme === 'light' ? -0.02 : 0.02;
    for (var i = 0; i < 20; i++) {
      var hex = oklchToHex(L, C, h);
      if (contrast(hex, P.paper) >= 4.5 && contrast(hex, P.raised) >= 4.5 && contrast(hex, P.sunken) >= 4.5) return { hex: hex, L: L, ok: true };
      L = +(L + step).toFixed(4);
      if (L < 0.2 || L > 0.96) break;
    }
    return { hex: oklchToHex(L, C, h), L: L, ok: false };
  }
  function fillOn(theme, h, rawC, rawHex) {
    // заливка под основной текст (--ink темы ≥ 4.5:1)
    var P = PAPER[theme], target = theme === 'light' ? 0.82 : 0.30;
    var lch = hexToOklch(rawHex);
    if (Math.abs(lch.l - target) <= 0.06 && contrast(P.ink, rawHex) >= 4.5) return { hex: rawHex.toUpperCase(), L: lch.l, ok: true, raw: true };
    var C = theme === 'light' ? 0.05 + 0.05 * Math.min(1, rawC / 0.18) : 0.05 + 0.04 * Math.min(1, rawC / 0.18);
    var L = target, step = theme === 'light' ? 0.02 : -0.02;
    for (var i = 0; i < 20; i++) {
      var hex = oklchToHex(L, C, h);
      if (contrast(P.ink, hex) >= 4.5) return { hex: hex, L: L, ok: true };
      L = +(L + step).toFixed(4);
    }
    return { hex: oklchToHex(L, C, h), L: L, ok: false };
  }
  function lineOn(theme, h, rawC, rawHex) {
    // нити розетки: графика ≥ 3:1 к бумаге
    var P = PAPER[theme], target = theme === 'light' ? 0.60 : 0.74;
    var lch = hexToOklch(rawHex);
    if (Math.abs(lch.l - target) <= 0.06 && lch.c >= 0.04 && contrast(rawHex, P.paper) >= 3) return { hex: rawHex.toUpperCase(), ok: true, raw: true };
    var C = Math.min(0.16, 0.09 + 0.07 * Math.min(1, rawC / 0.18));
    var L = target, step = theme === 'light' ? -0.02 : 0.02;
    for (var i = 0; i < 20; i++) {
      var hex = oklchToHex(L, C, h);
      if (contrast(hex, P.paper) >= 3) return { hex: hex, ok: true };
      L = +(L + step).toFixed(4);
    }
    return { hex: oklchToHex(L, C, h), ok: false };
  }
  function buildColor(rawHex, hue, rawLch) {
    var fl = fillOn('light', hue, rawLch.c, rawHex), fd = fillOn('dark', hue, rawLch.c, rawHex);
    var tl = textOn('light', hue, rawLch.c), td = textOn('dark', hue, rawLch.c);
    var ll = lineOn('light', hue, rawLch.c, rawHex), ld = lineOn('dark', hue, rawLch.c, rawHex);
    return {
      raw: rawHex, rawHue: +rawLch.h.toFixed(2), hue: +hue.toFixed(2),
      fillL: fl.hex, fillD: fd.hex, textL: tl.hex, textD: td.hex, lineL: ll.hex, lineD: ld.hex,
      _ok: fl.ok && fd.ok && tl.ok && td.ok && ll.ok && ld.ok
    };
  }

  /* ------------------------------------------------------------------ *
   * «VIN мастера»
   * ------------------------------------------------------------------ */
  function vinCheckDigit(code17) {
    var s = 0;
    for (var i = 0; i < 17; i++) {
      var ch = code17[i];
      var v = /[0-9]/.test(ch) ? +ch : VIN_TRANSLIT[ch];
      if (v === undefined) throw new Error('\u041d\u0435\u0434\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0439 \u0437\u043d\u0430\u043a VIN: ' + ch);
      s += v * VIN_WEIGHTS[i];
    }
    var r = s % 11;
    return r === 10 ? 'X' : String(r);
  }
  function initialOf(word) {
    for (var i = 0; i < word.length; i++) {
      var lo = word[i].toLowerCase();
      if (INITIAL[lo]) return INITIAL[lo];
      if (/[a-z]/.test(lo)) return lo.toUpperCase();
    }
    return 'X';
  }
  function makeStyleCode(st) {
    var wmi = st.words.slice(0, 3).map(initialOf).join('');
    wmi = (wmi + 'VGN').slice(0, 3);                       // добивка «ViGNette»
    var two = function (n) { n = mod(Math.round(n), 100); return (n < 10 ? '0' : '') + n; };
    var four = function (n) { var s = String(mod(Math.round(n), 10000)); return '0000'.slice(s.length) + s; };
    var head = wmi + st.template + (st.railSide === 'left' ? 'L' : 'R') + two(st.flar) + VIN_ALPHA[st.elsh];
    var tail = 'T' + st.elgr + two(st.volm) + four(st.total);   // T = серия 2026
    var code = head + '0' + tail;
    var cd = vinCheckDigit(code);
    return { styleCode: head + cd + tail, checkDigit: cd };
  }

  /* ------------------------------------------------------------------ *
   * fromName
   * ------------------------------------------------------------------ */
  function fromName(fullName, opts) {
    opts = opts || {};
    var turns = clamp(Math.floor(opts.turns || 0), 0, 2);   // «поворот палитры» на 137.5°, не больше 2 раз
    var p = parseName(fullName);
    var stub = p.words.length === 0;
    var total = p.sums.reduce(function (a, b) { return a + b; }, 0);

    // гомоглифы → hex
    var glyphs = [], hex = '';
    p.words.forEach(function (w, wi) {
      var pos = 0;
      for (var i = 0; i < w.length; i++) {
        var ch = w[i];
        if (!letterValue(ch) && !/[0-9]/.test(ch)) continue;
        var hx = hexOf(ch);
        if (hx && glyphs.length < 12) { glyphs.push({ ch: ch, hex: hx, word: wi, pos: pos }); hex += hx; }
        pos++;
      }
    });
    var padded = hex.length < 12;
    if (padded) {
      var pad = p.sums.map(function (s) { var h = s.toString(16).toUpperCase(); return h.length < 2 ? '0' + h : h; }).join('');
      if (p.sums.length) pad += total.toString(16).toUpperCase();
      if (!pad) pad = '779999226688';                     // заглушка: #799 · #268
      var k = 0;
      while (hex.length < 12) hex += pad[k++ % pad.length];
    }
    var hex12 = hex.slice(0, 12);
    var rawA = '#' + hex12.slice(0, 6), rawB = '#' + hex12.slice(6, 12);
    var lchA = hexToOklch(rawA), lchB = hexToOklch(rawB);

    // оттенки: только hue, серым — синтетический по золотому углу
    var hA = lchA.c < 0.025 ? mod(total * GOLDEN + 17, 360) : lchA.h;
    var hB = lchB.c < 0.025 ? mod(hA + GOLDEN, 360) : lchB.h;
    hA = repel(mod(hA + turns * GOLDEN, 360));
    hB = repel(mod(hB + turns * GOLDEN, 360));
    for (var g = 0; g < 3 && hueDist(hA, hB) < 30; g++) hB = repel(hB + GOLDEN);

    var colorA = buildColor(rawA, hA, lchA), colorB = buildColor(rawB, hB, lchB);

    var tIdx = mod(total, 7);
    var st = {
      name: p.name, words: p.words, letters: p.letters, sums: p.sums, total: total,
      glyphs: glyphs, padded: padded, hex12: hex12, stub: stub, turns: turns,
      colorA: colorA, colorB: colorB,
      template: tIdx, templateSpec: TEMPLATES[tIdx].slice(),
      railSide: total % 2 === 0 ? 'left' : 'right',
      flar: mod(total, 100),
      volm: mod(p.sums.length > 1 ? p.sums[1] : Math.round(total * 1.618), 100),
      elsh: mod(total, 17),
      elgr: 1 + mod(total, 2),
      rakeAngle: +(mod(total, 17) * 360 / 17).toFixed(3)
    };
    var sc = makeStyleCode(st);
    st.styleCode = sc.styleCode; st.checkDigit = sc.checkDigit;

    // слои розетки: слова (не больше трёх; 4+ слов — хвост сливается в третий слой), недостающие — из сумм
    var lw = [];
    for (var i = 0; i < Math.min(2, p.words.length); i++) lw.push({ letters: p.letters[i], sum: p.sums[i] });
    if (p.words.length >= 3) {
      var rl = 0, rs = 0;
      for (var j = 2; j < p.words.length; j++) { rl += p.letters[j]; rs += p.sums[j]; }
      lw.push({ letters: p.words.length === 3 ? rl : Math.max(3, Math.round(rl / (p.words.length - 2))), sum: rs });
    }
    var seed = total || 268;
    while (lw.length < 3) {
      var q = lw.length;
      lw.push({ letters: 5 + mod(seed * (q + 3) + q * 7, 9), sum: 40 + mod(seed * (q + 1) * 13 + 29 * q, 80), synthetic: true });
    }
    var maxSum = Math.max.apply(null, lw.map(function (x) { return x.sum; }));
    var lineCols = [[GUILLOCHE, GUILLOCHE], [colorA.lineL, colorA.lineD], [colorB.lineL, colorB.lineD]];
    st.layers = lw.map(function (x, i) {
      return {
        petals: clamp(x.letters, 3, 21),
        amp: +(x.sum / maxSum).toFixed(4),
        phase: +(mod(x.sum, 17) / 17 * 360).toFixed(3),
        colorL: lineCols[i][0], colorD: lineCols[i][1],
        synthetic: !!x.synthetic
      };
    });

    // проверка контраста: текст ≥ 4.5 на paper/raised/sunken обеих тем, --ink на заливке ≥ 4.5, нити ≥ 3
    var checks = [];
    [colorA, colorB].forEach(function (c, ci) {
      var n = ci ? 'B' : 'A';
      ['paper', 'raised', 'sunken'].forEach(function (k) {
        checks.push({ pair: n + '.textL/' + k, ratio: contrast(c.textL, PAPER.light[k]), min: 4.5 });
        checks.push({ pair: n + '.textD/' + k, ratio: contrast(c.textD, PAPER.dark[k]), min: 4.5 });
      });
      checks.push({ pair: 'ink/' + n + '.fillL', ratio: contrast(PAPER.light.ink, c.fillL), min: 4.5 });
      checks.push({ pair: 'ink/' + n + '.fillD', ratio: contrast(PAPER.dark.ink, c.fillD), min: 4.5 });
      checks.push({ pair: n + '.lineL/paper', ratio: contrast(c.lineL, PAPER.light.paper), min: 3 });
      checks.push({ pair: n + '.lineD/paper', ratio: contrast(c.lineD, PAPER.dark.paper), min: 3 });
    });
    checks.forEach(function (c) { c.ratio = +c.ratio.toFixed(2); c.ok = c.ratio >= c.min; });
    st.checks = checks;
    st.passed = checks.every(function (c) { return c.ok; });
    delete colorA._ok; delete colorB._ok;
    return st;
  }

  /* ------------------------------------------------------------------ *
   * Розетка-гильош
   * ------------------------------------------------------------------ */
  var uid = 0;
  var f1 = function (n) { return Math.round(n * 10) / 10; };

  // Геометрия слоя. Базовая кривая: ρ(t) = r0 + m·Σ w_j·cos(μ_j·n·t + μ_j·φ + ψ_j).
  // Каждое косинусное слагаемое — пара вращающихся векторов e^{i(1±μn)t}, то есть кривая —
  // суперпозиция эпитрохоиды и гипотрохоиды (n = буквы слова, φ = фаза слова).
  // Нить k — та же кривая, повёрнутая на k/17 доли лепестка (и во внешнем слое чуть уменьшенная):
  // соседние нити пересекаются на склонах лепестков и плетут решётку банкнотного гильоша.
  // Внутренний и средний слои заполняют полный лепесток → сплошное кружевное кольцо;
  // внешний — только 70–90% лепестка → край остаётся фестончатым.
  function layerGeometry(layer, i, R, total) {
    var n = layer.petals, a = layer.amp, phi = layer.phase * Math.PI / 180;
    var bands = [[0.06, 0.42], [0.30, 0.72], [0.56, 0.985]];
    var lo = bands[i][0] * R, hi = bands[i][1] * R, half = (hi - lo) / 2;
    var m = half * (0.6 + 0.4 * a);
    var h2 = 0.3 + 0.2 * a;                                    // доля второй гармоники
    var harm = i === 0 ? [[1, 1, 0]]
      : i === 1 ? [[1, 1 - h2, 0], [2, h2, 0]]
      : [[1, 1 - h2 - 0.05, 0], [2, h2 + 0.05, Math.PI / 2]];
    var spread = (i === 2 ? 0.7 + 0.05 * mod(total, 5) : 1) * 360 / n;
    var shrink = i === 2 ? 0.025 : 0;
    return { n: n, m: m, r0: hi - m, phi: phi, harm: harm, spread: spread, shrink: shrink };
  }
  function threadPath(G, pts) {
    var d = '', TAU = Math.PI * 2, px = 0, py = 0;
    for (var j = 0; j < pts; j++) {
      var t = j / pts * TAU, rho = G.r0;
      for (var q = 0; q < G.harm.length; q++) {
        var H = G.harm[q];
        rho += G.m * H[1] * Math.cos(H[0] * (G.n * t + G.phi) + H[2]);
      }
      var x = Math.round(rho * Math.cos(t) * 10), y = Math.round(rho * Math.sin(t) * 10);
      if (j === 0) d = 'M' + x / 10 + ' ' + y / 10;
      else { var dx = (x - px) / 10, dy = (y - py) / 10; d += 'l' + dx + (dy < 0 ? '' : ' ') + dy; }
      px = x; py = y;
    }
    return d + 'z';
  }

  /**
   * rosetteSVG(style, {size=320, threads=17, stroke=0.6, theme:'auto'|'light'|'dark', animate=false, idPrefix})
   * Цвет слоёв — var(--rosette-1..3) с фолбэком на цвета стиля (учитывает prefers-color-scheme и [data-theme]).
   */
  function rosetteSVG(style, opts) {
    opts = opts || {};
    style = style || fromName('');
    var size = opts.size || 320, threads = clamp(Math.round(opts.threads || 17), 1, 64);
    var stroke = opts.stroke != null ? opts.stroke : 0.6, theme = opts.theme || 'auto';
    var animate = !!opts.animate;
    var id = opts.idPrefix || ('vg' + (style.hex12 || 'x').toLowerCase() + '-' + (++uid));
    var R = size / 2 * 0.985;
    var pts = Math.round(clamp(size * 1.6, 420, 1000));   // 3 кривые × pts точек; нити — <use> с поворотом
    var sel = '#' + id;
    var css = '';
    style.layers.forEach(function (L, i) {
      var v = '--rosette-' + (i + 1);
      if (theme === 'light') css += sel + ' .vg-l' + (i + 1) + '{stroke:' + L.colorL + '}';
      else if (theme === 'dark') css += sel + ' .vg-l' + (i + 1) + '{stroke:' + L.colorD + '}';
      else {
        css += sel + ' .vg-l' + (i + 1) + '{stroke:var(' + v + ',' + L.colorL + ')}';
        css += '@media (prefers-color-scheme:dark){:root:not([data-theme=light]) ' + sel + ' .vg-l' + (i + 1) + '{stroke:var(' + v + ',' + L.colorD + ')}}';
        css += ':root[data-theme=dark] ' + sel + ' .vg-l' + (i + 1) + '{stroke:var(' + v + ',' + L.colorD + ')}';
      }
    });
    if (animate) {
      css += sel + ' use,' + sel + ' path{stroke-dasharray:1 1;stroke-dashoffset:1;animation:' + id + '-draw .9s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:var(--vg-delay,0s)}' +
        '@keyframes ' + id + '-draw{to{stroke-dashoffset:0}}' +
        '@media (prefers-reduced-motion:reduce){' + sel + ' use,' + sel + ' path{animation:none;stroke-dashoffset:0}}';
    }
    var defs = '', body = '';
    style.layers.forEach(function (L, i) {
      var G = layerGeometry(L, i, R, style.total || 0);
      var g = '<g class="vg-l vg-l' + (i + 1) + '" stroke-width="' + stroke + '">';
            defs += '<path id="' + id + '-c' + i + '" d="' + threadPath(G, pts) + '"' + (animate ? ' pathLength="1"' : '') + '/>';
      for (var k = 0; k < threads; k++) {
        var st = '';
        if (animate) {
          // сдвиг по золотому углу: доля k·137.5°/360 mod 1, слои идут друг за другом по 0.9 с
          var delay = i * 0.9 + mod(k * GOLDEN / 360, 1) * 0.45;
          st = ' style="--vg-delay:' + delay.toFixed(3) + 's"';
        }
        var u = threads > 1 ? k / (threads - 1) : 0;
        var rot = Math.round(k * G.spread / threads * 1000) / 1000;
        var sc = Math.round((1 - G.shrink * u) * 10000) / 10000;
        var tr = (rot ? 'rotate(' + rot + ')' : '') + (sc !== 1 ? ' scale(' + sc + ')' : '');
        g += '<use href="#' + id + '-c' + i + '"' + (tr ? ' transform="' + tr.trim() + '"' : '') + st + '/>';
      }
      body += g + '</g>';
    });
    var label = '\u0418\u043c\u0435\u043d\u043d\u0430\u044f \u0440\u043e\u0437\u0435\u0442\u043a\u0430' + (style.name ? ': ' + style.name.replace(/[<>&"]/g, '') : '');
    return '<svg xmlns="http://www.w3.org/2000/svg" id="' + id + '" class="vg-rosette" viewBox="' + (-size / 2) + ' ' + (-size / 2) + ' ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + label + '">' +
      '<style>' + css + '</style><defs>' + defs + '</defs>' +
      '<g fill="none" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">' + body + '</g></svg>';
  }

  /* ------------------------------------------------------------------ *
   * apply
   * ------------------------------------------------------------------ */
  function apply(style, el) {
    el = el || (typeof document !== 'undefined' ? document.documentElement : null);
    if (!el) return style;
    var s = el.style;
    s.setProperty('--spec-a-l', style.colorA.fillL);
    s.setProperty('--spec-a-d', style.colorA.fillD);
    s.setProperty('--spec-a-text-l', style.colorA.textL);
    s.setProperty('--spec-a-text-d', style.colorA.textD);
    s.setProperty('--spec-b-l', style.colorB.fillL);
    s.setProperty('--spec-b-d', style.colorB.fillD);
    s.setProperty('--spec-b-text-l', style.colorB.textL);
    s.setProperty('--spec-b-text-d', style.colorB.textD);
    style.layers.forEach(function (L, i) {
      s.setProperty('--rosette-' + (i + 1) + '-l', L.colorL);
      s.setProperty('--rosette-' + (i + 1) + '-d', L.colorD);
    });
    s.setProperty('--flar', String(style.flar));
    s.setProperty('--volm', String(style.volm));
    s.setProperty('--elsh', String(style.elsh));
    s.setProperty('--elgr', String(style.elgr));
    s.setProperty('--rake-angle', style.rakeAngle + 'deg');
    el.setAttribute('data-template', String(style.template));
    el.setAttribute('data-rail', style.railSide);
    el.setAttribute('data-vignette', style.styleCode);
    return style;
  }

  /* ------------------------------------------------------------------ *
   * Пресеты: 7 вымышленных мастеров (Подборкин первым), шаблоны 0…6 без повторов
   * ------------------------------------------------------------------ */
  // Подборкин · Злата Сергеевна Нуриева · Вера Сергеевна Обозова · Тимур Ильдарович Габбасов ·
  // Ева Захаровна Ковалёва-Бах · Ян Бек · Дарья Вадимовна Обухова
  var PRESET_NAMES = [
    '\u0410\u043b\u0435\u043a\u0441\u0435\u0439 \u0410\u043d\u0434\u0440\u0435\u0435\u0432\u0438\u0447 \u041f\u043e\u0434\u0431\u043e\u0440\u043a\u0438\u043d',
    '\u0417\u043b\u0430\u0442\u0430 \u0421\u0435\u0440\u0433\u0435\u0435\u0432\u043d\u0430 \u041d\u0443\u0440\u0438\u0435\u0432\u0430',
    '\u0412\u0435\u0440\u0430 \u0421\u0435\u0440\u0433\u0435\u0435\u0432\u043d\u0430 \u041e\u0431\u043e\u0437\u043e\u0432\u0430',
    '\u0422\u0438\u043c\u0443\u0440 \u0418\u043b\u044c\u0434\u0430\u0440\u043e\u0432\u0438\u0447 \u0413\u0430\u0431\u0431\u0430\u0441\u043e\u0432',
    '\u0415\u0432\u0430 \u0417\u0430\u0445\u0430\u0440\u043e\u0432\u043d\u0430 \u041a\u043e\u0432\u0430\u043b\u0451\u0432\u0430-\u0411\u0430\u0445',
    '\u042f\u043d \u0411\u0435\u043a',
    '\u0414\u0430\u0440\u044c\u044f \u0412\u0430\u0434\u0438\u043c\u043e\u0432\u043d\u0430 \u041e\u0431\u0443\u0445\u043e\u0432\u0430'
  ];
  var PRESETS = PRESET_NAMES.map(function (n) { return fromName(n); });

  return {
    version: '1.0.0',
    fromName: fromName,
    rosetteSVG: rosetteSVG,
    apply: apply,
    contrast: contrast,
    luminance: luminance,
    hexToOklch: hexToOklch,
    oklchToHex: oklchToHex,
    vinCheckDigit: vinCheckDigit,
    PRESETS: PRESETS,
    PRESET_NAMES: PRESET_NAMES,
    TEMPLATES: TEMPLATES,
    PAPER: PAPER,
    SYSTEM: SYSTEM,
    SYSTEM_HUES: SYSTEM_HUES,
    SYSTEM_NOMINAL: SYSTEM_NOMINAL
  };
});
