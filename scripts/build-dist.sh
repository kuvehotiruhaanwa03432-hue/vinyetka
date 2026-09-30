#!/usr/bin/env bash
# Собирает dist/ для обычного хостинга (Beget и т. п.).
# site/index.html написан под публикатор Artifact без <!doctype>/<head>, поэтому здесь он оборачивается в HTML-скелет.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
{
  printf '%s\n' '<!doctype html>' '<html lang="ru">' '<head>' \
    '<meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' \
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>' \
    '</head>' '<body>'
  cat site/index.html
  printf '\n%s\n' '</body>' '</html>'
} > dist/index.html
cp site/report.html site/ideas.html site/vignette.js dist/
echo "dist/ готов:"; ls -la dist
