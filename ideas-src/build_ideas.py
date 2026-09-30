# Собирает ideas.html из ideas.tpl.html и brief.json: статичный список идей, лестница, данные для JS.
import json, html, os
D = os.path.dirname(os.path.abspath(__file__))
b = json.load(open(os.path.join(D, '..', 'brief', 'brief.json')))
ideas = b['curated_ideas']
GROUPS = ['В отчёте', 'Для специалиста в поле', 'Деньги и рост', 'Безумные, но настоящие']
GKEY = ['rep', 'fld', 'mon', 'wld']
SHORT = ['Суфлёр торга', 'Синоптик владения', 'Режим «Для своих»', 'Журнал охоты', 'Пробег-криминалистика',
         'Договор с зубами', 'Штурман осмотра', 'Коды ошибок в рубли', 'Режим мороза', 'Чёрный ящик осмотра',
         'Провенанс деталей', 'Детектор вмешательства', 'Отказы бесплатно', 'База знаний даёт покупателей',
         'Медкарта машины', 'Застрахованный вердикт', 'Отчёт продаётся дважды', 'Руки в другом городе',
         'Финансирование в отчёте', 'Кладбище VIN', 'Натальная карта VIN', 'Протокол допроса',
         'Аудио-ЭКГ пуска', 'Карточка игрока']
# ступень: 0 = MVP (0–3 мес), 1 = 6 мес, 2 = 12 мес; зависимости — номера идей (с 1)
STAGE = {0:0,1:0,2:0,3:0,4:0,6:0,7:0,9:0,12:0,13:0,21:0,23:0,
         5:1,8:1,14:1,16:1,17:1,20:1,22:1,
         10:2,11:2,15:2,18:2,19:2}
# месяц внутри MVP
# месяц 1: всё, из чего растут остальные (штурман и коды ошибок нужны протоколу, суфлёру, синоптику)
MONTH = {12:1,9:1,4:1,6:1,7:1, 0:2,1:2,21:2, 2:3,3:3,23:3,13:3}
DEPS = {
 0:[5,8], 7:[], 6:[], 1:[7], 2:[2], 3:[13], 23:[1,4], 13:[7], 4:[], 21:[7], 9:[], 12:[],
 5:[22,1], 14:[2], 8:[7,10], 16:[13,10], 17:[], 20:[7], 22:[10],
 19:[13], 15:[10,5], 18:[1], 10:[7], 11:[8,5],
}
NOTE = {
 12:'Фундамент. С первой отказной виньетки копим VIN, пробег, толщины и причину отказа.',
 9:'Время, замеры, хеш. Без него не будет ни страховки, ни доверия к кладбищу.',
 4:'Свидетели пробега вносятся вручную или из лога сканера.',
 21:'Утверждения из объявления и ручные показания. Расшифровка звонков позже.',
 0:'Главный аргумент за 1 490 ₽. Находки уже посчитаны в рублях.',
 7:'Парсер экспорта ISTA, Xentry, Launch. OCR фото экрана позже.',
 6:'VIN-декодер и RAG по базе знаний. Бесплатный крючок для мастера.',
 1:'Горизонт 12 месяцев и +20 000 км, без сравнения кандидатов.',
 2:'Пересказ для семьи и голосование. Растит пересылки.',
 3:'Воронка охоты и шевроны. Отсеянные машины уже есть в отказных.',
 23:'Трофейная карточка без процентиля: сравнивать пока не с чем.',
 13:'Кнопка «Проверить машину» под ответами RAG. Лиды без рекламы.',
 5:'Факты для ДКП уже лежат в протоколе и суфлёре. Нужен юрист-партнёр.',
 14:'Появится после первых финальных виньеток. Нужен Telegram-бот.',
 8:'Когда маршрут обхода обкатан, переносим его в поле: Bluetooth, голос, офлайн.',
 16:'Отказных накопилось достаточно. Хеш и заморозка берутся из чёрного ящика.',
 17:'Нужны мастера хотя бы в Москве, Петербурге и паре городов-миллионников.',
 20:'Таблицы модернизаций из штурмана, упакованные в гороскоп.',
 22:'Записи пуска собираем с MVP как необязательное вложение, разметку добавляем здесь.',
 19:'К этому моменту в базе полгода отказов. Реестр открывается, когда VIN начинают повторяться.',
 15:'Страховщику нужна статистика вердиктов мастеров за 6–12 месяцев.',
 18:'Цена сделки уже известна из суфлёра. Нужны партнёры-банки и агентский договор.',
 10:'Компьютерное зрение по датам на стёклах, ремнях и шинах плюс SA-коды по VIN.',
 11:'Нужны логи диагностики и эталонные версии ПО. Растёт из кодов ошибок.',
}
import re
e = lambda s: html.escape(re.sub(r'(\d) (\d{3})', '\\1\u00a0\\2', s), quote=True)
SHAPES = {
 'rep': '<svg class="shp" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/></svg>',
 'fld': '<svg class="shp" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11"/></svg>',
 'mon': '<svg class="shp" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 8 8 14.5 1.5 8Z"/></svg>',
 'wld': '<svg class="shp" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 14.5 14H1.5Z"/></svg>',
}
STAGE_LBL = ['MVP · 3 мес', 'до 6 мес', 'до 12 мес']
EFF_LBL = {'S': 'малое', 'M': 'среднее', 'L': 'большое'}

def effort_html(ef):
    n = 'SML'.index(ef) + 1
    bars = ''.join('<i class="%s"></i>' % ('on' if k < n else '') for k in range(3))
    return '<div class="eff" aria-label="Усилие %s, %s"><span class="k">%s</span><span class="bars" aria-hidden="true">%s</span><span class="v">%s</span></div>' % (ef, EFF_LBL[ef], 'Усилие', bars, ef)

def wow_html(w):
    ticks = ''.join('<i class="%s" style="--h:%d"></i>' % ('on' if k < w else '', k + 1) for k in range(10))
    return '<div class="wow" aria-label="Wow %d из 10"><span class="k">Wow</span><span class="ticks" aria-hidden="true">%s</span><span class="v">%d</span></div>' % (w, ticks, w)

rows = []
for i, it in enumerate(ideas):
    g = GROUPS.index(it['group']); gk = GKEY[g]; st = STAGE[i]
    stamp = '<span class="stamp %s">%s</span>' % ('mvp' if it['in_mvp'] else 'later', 'MVP' if it['in_mvp'] else ('позже · ' + STAGE_LBL[st]))
    rows.append(f'''<article class="idea" id="idea-{i+1}" data-i="{i}" data-g="{gk}" data-mvp="{1 if it['in_mvp'] else 0}" data-e="{it['effort']}" data-w="{it['wow']}" aria-labelledby="it-{i+1}">
  <div class="i-num mono"><span>{i+1:02d}</span></div>
  <div class="i-main">
    <p class="i-grp">{SHAPES[gk]}{e(it['group'])}</p>
    <h3 class="i-t" id="it-{i+1}">{e(it['title'])}</h3>
    <p class="i-pitch">{e(it['pitch'])}</p>
    <div class="i-mech"><p class="lbl">Механика</p><p>{e(it['mechanics'])}</p></div>
  </div>
  <div class="i-money"><p class="lbl">Деньги</p><p>{e(it['money'])}</p></div>
  <div class="i-meta">{effort_html(it['effort'])}{wow_html(it['wow'])}{stamp}</div>
</article>''')

def chip(i):
    it = ideas[i]; gk = GKEY[GROUPS.index(it['group'])]
    return f'<a class="lchip" href="#idea-{i+1}">{SHAPES[gk]}<span class="mono">{i+1:02d}</span> {e(SHORT[i])}</a>'

steps = []
titles = ['Первые 3 месяца · MVP', 'До 6 месяцев', 'До 12 месяцев']
leads = ['Отчёт, который продаётся, и бесплатные отказы, которые копят данные.',
         'Идеи, которым нужны первые финальные виньетки и живые мастера в поле.',
         'Ставки на накопленные данные и партнёров: страховщики, банки, B2B.']
for s in range(3):
    idx = [i for i in range(24) if STAGE[i] == s]
    if s == 0:
        idx.sort(key=lambda i: (MONTH[i], i))
    else:
        idx.sort(key=lambda i: (-ideas[i]['wow'], i))
    items = []
    last_m = None
    for i in idx:
        if s == 0 and MONTH[i] != last_m:
            last_m = MONTH[i]
            items.append(f'<li class="mhead mono">Месяц {last_m}</li>')
        deps = DEPS.get(i, [])
        dep = ''
        if deps:
            dep = '<span class="dep">растёт из ' + ', '.join(f'<a href="#idea-{d}">{d:02d} {e(SHORT[d-1])}</a>' for d in deps) + '</span>'
        items.append(f'<li>{chip(i)}<p class="note">{e(NOTE[i])}</p>{dep}</li>')
    steps.append(f'''<li class="step s{s}">
  <div class="step-h"><p class="eyebrow">Ступень {s+1}</p><h3 class="step-t">{titles[s]}</h3><p class="small soft">{leads[s]}</p><p class="step-n mono">{len(idx)} идей</p></div>
  <ul class="step-l">{''.join(items)}</ul>
</li>''')

data = [{'t': it['title'], 's': SHORT[i], 'g': GKEY[GROUPS.index(it['group'])], 'gn': it['group'], 'e': it['effort'], 'w': it['wow'], 'mvp': it['in_mvp'], 'st': STAGE[i]} for i, it in enumerate(ideas)]
tpl = open(os.path.join(D, 'ideas.tpl.html'), encoding='utf-8').read()
out = (tpl.replace('<!--IDEAS-->', '\n'.join(rows))
          .replace('<!--LADDER-->', '\n'.join(steps))
          .replace('/*DATA*/[]', json.dumps(data, ensure_ascii=False).replace('</', '<\\/'))
          .replace('<!--NMVP-->', str(sum(1 for x in ideas if x['in_mvp']))))
# типографика: неразрывный пробел в числах и перед единицами, только в тексте разметки (не в CSS и не в скриптах)
NB = '\u00a0'
def typo(txt):
    prev = None
    while prev != txt:
        prev = txt
        txt = re.sub(r'(\d) (\d{3})(?!\d)', '\\1' + NB + '\\2', txt)
    txt = re.sub(r'(\d) (₽|км|мкм|тыс\.|млн|мес\.?(?![а-яё])|px|°C|%)', '\\1' + NB + '\\2', txt)
    txt = re.sub(r'(тыс\.|млн) ₽', '\\1' + NB + '₽', txt)
    return txt
b0 = out.index('<body>'); b1 = out.index('<script src="vignette.js">')
body = re.split(r'(<[^>]+>)', out[b0:b1])
body = ''.join(x if x.startswith('<') else typo(x) for x in body)
out = out[:b0] + body + out[b1:]
open(os.path.join(D, '..', 'site', 'ideas.html'), 'w', encoding='utf-8').write(out)
print('ok', len(out.encode('utf-8')))
