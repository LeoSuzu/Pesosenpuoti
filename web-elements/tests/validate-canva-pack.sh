#!/usr/bin/env sh
set -eu

base=web-elements/canva-editable
for asset in \
  "$base/00-koottu-malli.svg" \
  "$base/osat/01-runko.svg" \
  "$base/osat/02-masto.svg" \
  "$base/osat/03-vasen-purje.svg" \
  "$base/osat/04-oikea-purje.svg" \
  "$base/osat/05-vasen-p.svg" \
  "$base/osat/06-oikea-p.svg" \
  "$base/osat/07-pesosen.svg" \
  "$base/osat/08-puoti.svg" \
  "$base/README.md"
do
  test -f "$asset"
done

for asset in "$base"/*.svg "$base"/osat/*.svg; do
  rg -q '<svg[^>]*viewBox=' "$asset"
done

rg -q 'Lataa osat Canvan Lataukset-näkymään' "$base/README.md"
