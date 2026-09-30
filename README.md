# Виньетка

Интерактивные отчёты по автомобилю для специалистов автоподбора (BMW / Mercedes).
Каждый мастер получает собственный стиль отчёта, который детерминированно выводится из его ФИО:
цвета из букв-гомоглифов, гильош-розетка, шаблон сетки, параметры шрифтов.

Опубликованный прототип: https://claude.ai/artifact/BTau768WHMHgUYqMRc95s2 (приватная ссылка).

## Структура

| Папка | Что внутри |
|---|---|
| `site/` | Готовые страницы: `index.html` (лендинг), `report.html` (демо-отчёт Т-000417, BMW 530d G30), `ideas.html` (карта 24 идей), `vignette.js` (движок стилей) |
| `engine/` | Тесты движка (`engine.test.js`), демо-сетка розеток, стенды геометрии розетки |
| `ideas-src/` | Шаблон и скрипт сборки `ideas.html` из брифа |
| `brief/` | Креативный бриф: выбранное направление, палитры, шрифты, скрытые паттерны строки, идеи (`brief.json`), альтернативное направление (`dirs.json`) |
| `tools/` | `shot.js` — скриншоты страниц (390/1280 px, светлая/тёмная тема) через Playwright; `qa/` — скрипты проверки интерактива и контраста |
| `docs/screenshots/` | Итоговые кадры |

## Команды

```bash
node engine/engine.test.js            # тесты движка стилей
python3 ideas-src/build_ideas.py      # пересобрать site/ideas.html
NODE_PATH=$(npm root -g) node tools/shot.js site/report.html docs/screenshots/report   # скриншоты (нужен playwright)
```

`site/index.html` написан без `<!doctype>`/`<head>`: так его ожидает публикатор Artifact на claude.ai.
Для обычного хостинга оберните содержимое в стандартный HTML-скелет.

## Деплой на Beget

`scripts/build-dist.sh` собирает `dist/` (лендинг в обычном HTML-скелете + отчёт, карта идей, движок).
Workflow `.github/workflows/deploy-beget.yml` заливает `dist/` по FTP при каждом push в `main`, который меняет `site/`,
и вручную из вкладки Actions (Run workflow). Нужны секреты репозитория (Settings → Secrets and variables → Actions):

| Секрет | Пример |
|---|---|
| `BEGET_FTP_HOST` | FTP-сервер из панели Beget (раздел FTP) |
| `BEGET_FTP_USER` | логин FTP-аккаунта |
| `BEGET_FTP_PASSWORD` | пароль FTP-аккаунта |
| `BEGET_FTP_DIR` | папка сайта, например `/vinyetka.ru/public_html/` (со слешем в конце) |

Без секретов workflow только собирает `dist/` и пропускает загрузку с предупреждением.

## Движок стилей (`site/vignette.js`)

```html
<script src="vignette.js"></script>
<script>
  const s = Vignette.fromName('Алексей Андреевич Подборкин'); // #AECEAE / #EB4060, шаблон 1·8·8
  Vignette.apply(s);                                          // CSS-переменные --spec-a-*, --spec-b-*, --rosette-*
  el.innerHTML = Vignette.rosetteSVG(s, { size: 320, animate: true });
</script>
```

Демо-данные (машина, продавец, цены, прочие мастера) вымышлены. Независимый сервис, не связан с автопроизводителями.
