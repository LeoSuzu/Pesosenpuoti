#!/usr/bin/env sh
set -eu

for asset in \
  web-elements/logos/purjeet-pp.svg \
  web-elements/logos/telakka-pp.svg \
  web-elements/logos/kompassi-pp.svg \
  web-elements/logos/favicon.svg \
  web-elements/logos/favicon-v2.svg \
  web-elements/icons/veneen-korjaus.svg \
  web-elements/icons/kausi-ja-perushuolto.svg \
  web-elements/icons/erikoistyo.svg \
  web-elements/icons/jaatelovene.svg \
  web-elements/icons/kysy-arviota.svg \
  web-elements/icons/kompassi.svg
do
  test -f "$asset"
  rg -q '<svg[^>]*viewBox=' "$asset"
done

logo=web-elements/logos/purjeet-pp.svg
# Both P letters are small enough to sit within the sail shapes; the wordmark
# is a connected PesosenPuoti lockup split only by the two brand colors.
rg -q 'font-size="24" font-weight="800"><text x="80" y="70">P</text><text x="121" y="70">P</text>' "$logo"
rg -q 'font-size="22" font-weight="800"><text x="216" y="58" fill="#2f7d8c">Pesosen</text><text x="216" y="83" fill="#6f9a48">Puoti</text>' "$logo"
rg -q 'font-size="12" font-weight="800"><text x="22" y="42">P</text><text x="39" y="42">P</text>' web-elements/logos/favicon.svg
