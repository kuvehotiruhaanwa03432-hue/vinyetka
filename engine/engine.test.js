// node engine.test.js — тесты движка стиля «Виньетки»
'use strict';
const assert = require('assert');
const V = require('../site/vignette.js');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ok  ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

// независимая реализация контрольного знака VIN (ISO 3779 / 49 CFR 565)
function refCheck(vin) {
  const tr = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
  const w = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let s = 0;
  for (let i = 0; i < 17; i++) s += (/\d/.test(vin[i]) ? +vin[i] : tr[vin[i]]) * w[i];
  return s % 11 === 10 ? 'X' : String(s % 11);
}
const LIGHT = '#EDF3EE', DARK = '#0E171B';

console.log('Эталон');
const P = V.fromName('Алексей Андреевич Подборкин');
t('суммы, итог, буквы', () => {
  assert.deepStrictEqual(P.sums, [68, 89, 111]);
  assert.strictEqual(P.total, 268);
  assert.deepStrictEqual(P.letters, [7, 9, 9]);
});
t('hex12 = AECEAEEB4060, без добивки', () => {
  assert.strictEqual(P.hex12, 'AECEAEEB4060');
  assert.strictEqual(P.padded, false);
  assert.strictEqual(P.glyphs.length, 12);
  assert.deepStrictEqual(P.glyphs[0], { ch: 'А', hex: 'A', word: 0, pos: 0 });
  assert.deepStrictEqual(P.glyphs.map(g => g.hex).join(''), 'AECEAEEB4060');
  assert.deepStrictEqual(P.glyphs[11], { ch: 'о', hex: '0', word: 2, pos: 4 });
});
t('шаблон 2 [1,8,8], рельс слева, FLAR 68, VOLM 89, ELSH 13, ELGR 1', () => {
  assert.strictEqual(P.template, 2);
  assert.deepStrictEqual(P.templateSpec, [1, 8, 8]);
  assert.strictEqual(P.railSide, 'left');
  assert.strictEqual(P.flar, 68); assert.strictEqual(P.volm, 89);
  assert.strictEqual(P.elsh, 13); assert.strictEqual(P.elgr, 1);
  assert.ok(Math.abs(P.rakeAngle - 13 * 360 / 17) < 0.01);
});
t('colorA.raw = #AECEAE и он же заливка светлой темы', () => {
  assert.strictEqual(P.colorA.raw, '#AECEAE');
  assert.strictEqual(P.colorA.fillL, '#AECEAE');
  assert.strictEqual(P.colorB.raw, '#EB4060');
});
t('розетка: лепестки 7/9/9, амплитуды 68/111, 89/111, 1', () => {
  assert.deepStrictEqual(P.layers.map(l => l.petals), [7, 9, 9]);
  assert.ok(Math.abs(P.layers[0].amp - 68 / 111) < 1e-3 && Math.abs(P.layers[1].amp - 89 / 111) < 1e-3 && P.layers[2].amp === 1);
  assert.ok(Math.abs(P.layers[1].phase - 4 / 17 * 360) < 1e-2);
});

console.log('Детерминизм');
t('одно имя → один стиль (включая пробелы по краям)', () => {
  const a = JSON.stringify(V.fromName('Алексей Андреевич Подборкин'));
  const b = JSON.stringify(V.fromName('  Алексей   Андреевич Подборкин '));
  assert.strictEqual(a, b);
  assert.strictEqual(V.rosetteSVG(P, { idPrefix: 'x' }), V.rosetteSVG(V.fromName('Алексей Андреевич Подборкин'), { idPrefix: 'x' }));
});

console.log('Пресеты');
t('7 пресетов, Подборкин первым', () => {
  assert.strictEqual(V.PRESETS.length, 7);
  assert.strictEqual(V.PRESETS[0].name, 'Алексей Андреевич Подборкин');
});
t('попарно разные hex12, шаблоны и коды', () => {
  const S = V.PRESETS;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    assert.notStrictEqual(S[i].hex12, S[j].hex12, S[i].name + ' / ' + S[j].name + ': hex');
    assert.notStrictEqual(S[i].template, S[j].template, S[i].name + ' / ' + S[j].name + ': шаблон');
    assert.notStrictEqual(S[i].styleCode, S[j].styleCode);
  }
});
t('есть двойная фамилия и короткое имя', () => {
  assert.ok(V.PRESETS.some(s => /-/.test(s.name)));
  assert.ok(V.PRESETS.some(s => s.words.length === 2));
});
t('все passed; textL ≥ 4.5 к #EDF3EE, textD ≥ 4.5 к #0E171B (обоих цветов)', () => {
  for (const s of V.PRESETS) {
    assert.ok(s.passed, s.name + ': ' + s.checks.filter(c => !c.ok).map(c => c.pair + ' ' + c.ratio).join(', '));
    for (const c of [s.colorA, s.colorB]) {
      assert.ok(V.contrast(c.textL, LIGHT) >= 4.5, s.name + ' textL ' + c.textL);
      assert.ok(V.contrast(c.textD, DARK) >= 4.5, s.name + ' textD ' + c.textD);
    }
  }
});
t('оттенки текста не ближе 20° к системным (danger/ok/clean/doubt), A и Б не ближе 30°', () => {
  const d = (a, b) => { let x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };
  for (const s of V.PRESETS) {
    for (const c of [s.colorA, s.colorB]) for (const k in V.SYSTEM_HUES) assert.ok(d(c.hue, V.SYSTEM_HUES[k]) >= 20, s.name + ' ' + k);
    assert.ok(d(s.colorA.hue, s.colorB.hue) >= 30, s.name + ' A~B');
  }
});
t('коридоры OKLCH: текст L 0.46–0.52 / 0.74–0.80 (±шаг проверки), C ≤ 0.15', () => {
  for (const s of V.PRESETS) for (const c of [s.colorA, s.colorB]) {
    const l = V.hexToOklch(c.textL), d = V.hexToOklch(c.textD);
    assert.ok(l.l >= 0.40 && l.l <= 0.525, s.name + ' textL L=' + l.l.toFixed(3));
    assert.ok(d.l >= 0.735 && d.l <= 0.86, s.name + ' textD L=' + d.l.toFixed(3));
    assert.ok(l.c <= 0.152 && d.c <= 0.152, s.name + ' C');
  }
});

console.log('VIN мастера');
t('формула контрольного знака на известном VIN 1M8GDM9AXKP042788 → X', () => {
  assert.strictEqual(V.vinCheckDigit('1M8GDM9A0KP042788'), 'X');
  assert.strictEqual(refCheck('1M8GDM9AXKP042788'), 'X');
});
t('styleCode: 17 знаков алфавита VIN, 9-я позиция = checkDigit по формуле', () => {
  for (const s of V.PRESETS.concat([V.fromName(''), V.fromName('John Smith'), V.fromName('Ия')])) {
    assert.match(s.styleCode, /^[0-9A-HJ-NPR-Z]{17}$/, s.name + ' ' + s.styleCode);
    assert.strictEqual(s.styleCode[8], s.checkDigit);
    assert.strictEqual(refCheck(s.styleCode), s.checkDigit, s.name);
  }
});

console.log('Деградация');
t('латинское имя: суммы по латинскому алфавиту, a–f как hex', () => {
  const s = V.fromName('Fedor Abbasov');
  assert.deepStrictEqual(s.sums, [6 + 5 + 4 + 15 + 18, 1 + 2 + 2 + 1 + 19 + 15 + 22]);
  assert.strictEqual(s.glyphs.map(g => g.hex).join('').slice(0, 7), 'FEDABBA');
  assert.ok(s.passed && s.layers.length === 3);
});
t('имя из одного слова: 3 слоя (2 синтетических), добивка суммами, passed', () => {
  const s = V.fromName('Мадонна');
  assert.strictEqual(s.words.length, 1);
  assert.strictEqual(s.layers.length, 3);
  assert.deepStrictEqual(s.layers.map(l => l.synthetic), [false, true, true]);
  assert.strictEqual(s.padded, true);
  assert.strictEqual(s.hex12.length, 12);
  assert.ok(s.passed);
  assert.ok(s.volm >= 0 && s.volm < 100);
});
t('4+ слов: хвост сливается в третий слой', () => {
  const s = V.fromName('Анна Мария Сергеевна Беккер Звягинцева');
  assert.strictEqual(s.layers.length, 3);
  assert.strictEqual(s.words.length, 5);
  assert.ok(s.passed);
});
t('пустое имя → заглушка', () => {
  for (const n of ['', '   ', null, undefined, '—  123 !!']) {
    const s = V.fromName(n);
    assert.ok(s.stub || s.words.length === 0 || n === '—  123 !!');
    assert.strictEqual(s.hex12.length, 12);
    assert.strictEqual(s.layers.length, 3);
    assert.ok(s.passed);
    assert.ok(V.rosetteSVG(s).startsWith('<svg'));
  }
  assert.strictEqual(V.fromName('').hex12, '779999226688');
});
t('поворот палитры turns=1 меняет оттенки, но не шаблон', () => {
  const a = V.fromName('Вера Сергеевна Обозова'), b = V.fromName('Вера Сергеевна Обозова', { turns: 1 });
  assert.notStrictEqual(a.colorA.textL, b.colorA.textL);
  assert.strictEqual(a.template, b.template);
  assert.ok(b.passed);
});

console.log('Розетка и утилиты');
t('rosetteSVG: 51 нить, var(--rosette-N), быстро (< 30 мс)', () => {
  const svg = V.rosetteSVG(P, { size: 320, idPrefix: 't' });
  assert.strictEqual((svg.match(/<use /g) || []).length, 51);
  assert.ok(/var\(--rosette-1,/.test(svg) && /var\(--rosette-3,/.test(svg));
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) V.rosetteSVG(V.PRESETS[i % 7], { size: 560 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 20;
  assert.ok(ms < 30, ms.toFixed(1) + ' мс');
  console.log('       ~' + ms.toFixed(2) + ' мс на розетку 560px');
});
t('rosetteSVG animate: pathLength=1 и задержки', () => {
  const svg = V.rosetteSVG(P, { animate: true, idPrefix: 'a' });
  assert.strictEqual((svg.match(/pathLength="1"/g) || []).length, 3);
  assert.strictEqual((svg.match(/--vg-delay:/g) || []).length, 51);
  assert.ok(/prefers-reduced-motion/.test(svg));
});
t('rosetteSVG theme light/dark подставляет цвета напрямую', () => {
  assert.ok(V.rosetteSVG(P, { theme: 'light', idPrefix: 'l' }).includes('stroke:#EB4060'));
  assert.ok(!V.rosetteSVG(P, { theme: 'dark', idPrefix: 'd' }).includes('var(--rosette'));
});
t('apply ставит переменные и data-атрибуты', () => {
  const props = {}, attrs = {};
  const el = { style: { setProperty: (k, v) => { props[k] = v; } }, setAttribute: (k, v) => { attrs[k] = v; } };
  V.apply(P, el);
  for (const k of ['--spec-a-l', '--spec-a-d', '--spec-a-text-l', '--spec-a-text-d', '--spec-b-l', '--spec-b-d', '--spec-b-text-l', '--spec-b-text-d',
    '--rosette-1-l', '--rosette-1-d', '--rosette-2-l', '--rosette-2-d', '--rosette-3-l', '--rosette-3-d', '--flar', '--volm', '--elsh', '--elgr', '--rake-angle'])
    assert.ok(props[k] != null, k);
  assert.strictEqual(attrs['data-template'], '2');
  assert.strictEqual(attrs['data-rail'], 'left');
  assert.strictEqual(props['--spec-a-l'], '#AECEAE');
});
t('OKLCH туда-обратно и контраст WCAG', () => {
  for (const h of ['#AECEAE', '#EB4060', '#226688', '#111111']) {
    const o = V.hexToOklch(h);
    assert.strictEqual(V.oklchToHex(o.l, o.c, o.h), h);
  }
  assert.ok(Math.abs(V.contrast('#000000', '#FFFFFF') - 21) < 1e-9);
  assert.ok(Math.abs(V.contrast('#111111', '#EDF3EE') - 16.8) < 0.1);
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
